// c:\Users\super\Documents\autoplancam\app\admin\actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db"; 
import { users, sessions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
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

// --- OBTENER TODOS LOS USUARIOS ---
export async function getUsers() {
  await verifyAdmin();
  // Seleccionamos todos los campos excepto la contraseña.
  const userList = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    createdAt: users.createdAt,
    expiresAt: users.expiresAt,
    banned: users.banned,
    reportsLimit: users.reportsLimit,
    loginCount: users.loginCount,
  }).from(users);

  // Para cada usuario, obtenemos la última vez que fue visto
  const usersWithLastSeen = await Promise.all(userList.map(async (user) => {
    const lastSession = await db.query.sessions.findFirst({
      where: eq(sessions.userId, user.id),
      orderBy: [desc(sessions.updatedAt)],
    });
    return { ...user, lastSeen: lastSession?.updatedAt || null };
  }));

  return usersWithLastSeen;
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
    const reportsLimit = reportsLimitStr ? parseInt(reportsLimitStr, 10) : 0;
    const expiresAt = expiresAtStr ? new Date(expiresAtStr) : null;

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
  const expiresAt = formData.get("expiresAt") ? new Date(formData.get("expiresAt") as string) : null;

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
    duration: s.expiresAt.getTime() - s.createdAt.getTime(), // Duración en milisegundos
  }));
}
