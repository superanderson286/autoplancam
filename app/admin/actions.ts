// c:\Users\super\Documents\autoplancam\app\admin\actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users, sessions } from "@/db/schema"; // Asegúrate de que 'sessions' esté aquí
import { eq, desc, gte, ilike, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// --- FUNCIÓN DE VERIFICACIÓN DE ROL DE ADMINISTRADOR ---
// Una función de seguridad que se llamará al inicio de cada acción.
async function verifyAdmin() {
  const session = await auth.api.getSession({ headers: new Headers(await headers()) });
  if (session?.user?.role !== "admin") {
    throw new Error("Acceso no autorizado.");
  }
  return session;
}

const USERS_PER_PAGE = 10; // Define el tamaño de la página aquí

// --- OBTENER USUARIOS (CON PAGINACIÓN Y BÚSQUEDA) ---
export async function getUsers({ page = 1, searchTerm = '' }: { page?: number; searchTerm?: string } = {}) {
  await verifyAdmin();

  const offset = (page - 1) * USERS_PER_PAGE;

  // Construye la condición WHERE para la búsqueda
  const whereCondition = searchTerm
    ? ilike(users.name, `%${searchTerm}%`) // ilike es para búsqueda insensible a mayúsculas/minúsculas en PostgreSQL
    : undefined;

  // 1. Subconsulta: Agrupa las sesiones por usuario y encuentra la más reciente para cada uno.
  const latestSessionSubquery = db
    .select({
      userId: sessions.userId,
      lastSeen: sql<Date>`max(${sessions.updatedAt})`.as('last_seen'),
    })
    .from(sessions)
    .groupBy(sessions.userId)
    .as('latest_sessions');

  // 2. Consulta principal: Une los usuarios con la subconsulta de la última sesión.
  const results = await db
    .select({
      user: users,
      lastSeen: latestSessionSubquery.lastSeen,
    })
    .from(users)
    .leftJoin(latestSessionSubquery, eq(users.id, latestSessionSubquery.userId))
    .where(whereCondition) // Aplica el filtro de búsqueda
    .limit(USERS_PER_PAGE)
    .offset(offset)
    // Ordena por la última vez visto (desc), poniendo a los que nunca han entrado (null) al final.
    .orderBy(sql`${latestSessionSubquery.lastSeen} DESC NULLS LAST`);

  // 3. Aplanamos los resultados para que sean más fáciles de usar en el cliente.
  const usersWithLastSeen = results.map(r => ({ ...r.user, lastSeen: r.lastSeen }));

  // 2. Obtiene el conteo total de usuarios que coinciden con la búsqueda
  const totalUsersResult = await db
    .select({ total: sql<number>`count(*)` })
    .from(users)
    .where(whereCondition); // Aplica el mismo filtro para el conteo

  const totalUsers = totalUsersResult[0].total;

  // 3. Devuelve ambos: los usuarios y el conteo total
  return {
    users: usersWithLastSeen,
    totalUsers: totalUsers,
    totalPages: Math.ceil(totalUsers / USERS_PER_PAGE)
  };
}

// --- CREAR UN NUEVO USUARIO ---
export async function createUser(formData: FormData) {
  await verifyAdmin();
  const email = formData.get("email") as string;
  const name = formData.get("name") as string;
  const role = formData.get("role") as string;
  const password = formData.get("password") as string;
  const reportsLimitStr = formData.get("reportsLimit") as string;
  const expiresAtStr = formData.get("expiresAt") as string;

  if (!email || !name || !role || !password) {
    return { error: "Todos los campos son requeridos." };
  }

  try {
    // 'better-auth' se encarga de hashear la contraseña automáticamente.
    // Paso 1: Crear el usuario con los datos básicos.
    const newUserResponse = await auth.api.createUser({
      body: {
        email,
        password,
        name,
        role: role as 'user' | 'admin', // Hacemos una aserción de tipo para satisfacer a TypeScript
      }
    });

    // Obtenemos el ID del usuario recién creado desde la respuesta.
    const newUserId = newUserResponse.user.id;

    // Paso 2: Actualizar el usuario con los campos de suscripción.
    const reportsLimit = reportsLimitStr ? parseInt(reportsLimitStr, 10) : 0; // Si no se especifica, 0
    let expiresAt: Date | null = null;
    if (expiresAtStr) {
      expiresAt = new Date(expiresAtStr);
      expiresAt.setHours(23, 59, 59, 999); // Establecer al final del día seleccionado
    }

    if (reportsLimit > 0 || expiresAt) {
      await db.update(users).set({
        reportsLimit: isNaN(reportsLimit) ? 0 : reportsLimit,
        expiresAt,
      }).where(eq(users.id, newUserId));
    }

    revalidatePath("/admin"); // Actualiza la caché para mostrar el nuevo usuario.
    return { success: "Usuario creado exitosamente." };
  } catch (error: any) {
    return { error: `Error al crear el usuario: ${error.message}` };
  }
}

// --- EDITAR UN USUARIO ---
export async function updateUser(formData: FormData) {
  await verifyAdmin();
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const role = formData.get("role") as string;
  const reportsLimit = parseInt(formData.get("reportsLimit") as string, 10);
  let expiresAt: Date | null = null;
  if (formData.get("expiresAt")) {
    expiresAt = new Date(formData.get("expiresAt") as string);
    expiresAt.setHours(23, 59, 59, 999); // Establecer al final del día seleccionado
  }

  try {
    await db.update(users).set({
      name,
      email,
      role,
      reportsLimit: isNaN(reportsLimit) ? 0 : reportsLimit,
      expiresAt,
    }).where(eq(users.id, id));

    revalidatePath("/admin");
    return { success: "Usuario actualizado." };
  } catch (error: any) {
    return { error: `Error al actualizar: ${error.message}` };
  }
}

// --- CAMBIAR CONTRASEÑA DE UN USUARIO ---
export async function changeUserPassword(formData: FormData) {
  await verifyAdmin();
  const id = formData.get("id") as string;
  const newPassword = formData.get("newPassword") as string;

  if (!newPassword || newPassword.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }

  try {
    // 'better-auth' proporciona un método para esto.
    // El método correcto es 'setUserPassword' y espera un objeto con 'params' y 'body'.
    await auth.api.setUserPassword({
      params: { id },
      body: {
        // La propiedad esperada por better-auth es 'newPassword', no 'password'.
        newPassword: newPassword, // La nueva contraseña
        userId: id, // El ID del usuario también es requerido en el body
      },
    });
    return { success: "Contraseña actualizada." };
  } catch (error: any) {
    return { error: `Error al cambiar la contraseña: ${error.message}` };
  }
}

// --- BANEAR/DESBANEAR UN USUARIO ---
export async function toggleUserBan(formData: FormData) {
  await verifyAdmin();
  const id = formData.get("id") as string;
  const isBanned = (formData.get("isBanned") as string) === 'true';
  const banReason = formData.get("banReason") as string;

  try {
    await db.update(users).set({
      banned: !isBanned, // Invierte el estado actual
      banReason: !isBanned ? banReason : null, // Añade o quita la razón
    }).where(eq(users.id, id));

    revalidatePath("/admin");
    return { success: `Usuario ${!isBanned ? 'baneado' : 'desbaneado'}.` };
  } catch (error: any) {
    return { error: `Error en la operación: ${error.message}` };
  }
}

// --- ELIMINAR UN USUARIO ---
export async function deleteUser(formData: FormData) {
  await verifyAdmin();
  const id = formData.get("id") as string;

  try {
    await db.delete(users).where(eq(users.id, id));
    revalidatePath("/admin");
    return { success: "Usuario eliminado." };
  } catch (error: any) {
    return { error: `Error al eliminar: ${error.message}` };
  }
}

// --- OBTENER HISTORIAL DE SESIONES DE UN USUARIO ---
export async function getSessionHistory(userId: string) {
  await verifyAdmin();
  const sessionHistory = await db.select().from(sessions).where(eq(sessions.userId, userId)).orderBy(desc(sessions.createdAt));
  return sessionHistory.map(s => ({
    ...s,
    duration: s.updatedAt.getTime() - s.createdAt.getTime(), // Duración en milisegundos
  }));
}

// --- ACCIÓN PARA GENERAR REPORTE DE FORMA SEGURA ---
export async function generateSecureReport(datosProyecto: any) {
  const session = await auth.api.getSession({ headers: new Headers(await headers()) });
  if (!session?.user?.id) {
    return { error: "No autenticado. Por favor, inicie sesión." };
  }

  const userId = session.user.id;

  // 1. Obtener los datos más recientes del usuario desde la base de datos.
  const currentUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!currentUser) {
    return { error: "Usuario no encontrado." };
  }

  // 2. Verificar si la cuenta ha expirado.
  if (currentUser.expiresAt && new Date() > new Date(currentUser.expiresAt)) {
    return { error: "Tu cuenta ha expirado. Por favor, contacta al soporte." };
  }

  // 3. Verificar el límite de reportes (solo si el límite es mayor que 0).
  if (currentUser.reportsLimit > 0 && currentUser.reportsUsed >= currentUser.reportsLimit) {
    return { error: `Has alcanzado tu límite de ${currentUser.reportsLimit} reportes. Por favor, contacta al soporte.` };
  }

  // 4. Si todas las verificaciones pasan, incrementar el contador de uso.
  await db
    .update(users)
    .set({ reportsUsed: (currentUser.reportsUsed || 0) + 1 })
    .where(eq(users.id, userId));

  // 5. Devolvemos un objeto de éxito para que el cliente sepa que puede proceder.
  return { success: true };
}
