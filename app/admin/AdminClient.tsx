// c:\Users\super\Documents\autoplancam\app\admin\AdminClient.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFormStatus } from "react-dom";
import { useState, useEffect, useCallback } from "react";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  toggleUserBan,
  changeUserPassword,
  getSessionHistory,
} from "./actions";
import { toast } from "sonner";
import { authClient } from "../../lib/auth-client";
import { SafeLocaleDate } from "../../components/SafeLocaleDate";

// Define el tipo para los usuarios que recibimos del servidor.
type User = Awaited<ReturnType<typeof getUsers>>['users'][number];
type SessionHistory = Awaited<ReturnType<typeof getSessionHistory>>;

// Componente de Modal (Placeholder)
// En una aplicación real, usarías un componente de UI como Radix, Shadcn/UI, etc.
const Modal = ({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="text-2xl">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default function AdminClient({ initialData }: { initialData: Awaited<ReturnType<typeof getUsers>>}) {
  const [users, setUsers] = useState(initialData.users);
  const [totalUsers, setTotalUsers] = useState(initialData.totalUsers);
  const [totalPages, setTotalPages] = useState(initialData.totalPages);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<(() => React.ReactNode) | null>(null);
  const [modalTitle, setModalTitle] = useState("");
  const router = useRouter();
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // 1. Función para refrescar la lista de usuarios desde el servidor
  // La इwrapamos en useCallback para estabilizar su referencia y evitar re-renders innecesarios.
  const refreshUsers = useCallback(async (page: number, term: string) => {
    setIsLoading(true);
    try {
      const data = await getUsers({ page, searchTerm: term });
      setUsers(data.users);
      setTotalUsers(data.totalUsers); // Actualiza el conteo total
      setTotalPages(data.totalPages); // Actualiza el total de páginas
    } catch (error) {
      if (error instanceof Error) {
        toast.error(`Error al refrescar la lista de usuarios: ${error.message}`);
      }
    } finally {
      // Aseguramos que el estado de carga se desactive siempre
      setIsLoading(false);
    }
  }, []); // Las dependencias están vacías porque los setters de estado son estables.

  // Efecto para aplicar debounce a la búsqueda
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      // Cuando el término de búsqueda cambia, reseteamos a la página 1 y refrescamos.
      if (searchTerm !== debouncedSearchTerm) {
        setCurrentPage(1);
        refreshUsers(1, searchTerm);
      }
    }, 500); // 500ms de retraso

    // Limpia el temporizador si el componente se desmonta o si searchTerm cambia
    return () => {
      clearTimeout(timerId);
    };
  }, [searchTerm, debouncedSearchTerm, refreshUsers]);

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          // Redirige a la página principal después de cerrar sesión
          router.push("/");
        },
      },
    });
  };

  const handleAction = async (action: (formData: FormData) => Promise<any>, formData: FormData, successMessage: string) => {
    const result = await action(formData);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success(result.success || successMessage);
      await refreshUsers(currentPage, debouncedSearchTerm); // 2. Llama a la función de refresco después de una acción exitosa
      closeModal();
    }
  };

  const openModal = (title: string, content: () => React.ReactNode) => {
    setModalTitle(title);
    // Almacenamos una función que renderiza el contenido para que se cree fresco cada vez.
    setModalContent(() => content);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalContent(null);
  };

  // --- Componente de Botón con Estado de Carga ---
  // Este componente utiliza useFormStatus para reaccionar al estado de la acción del formulario.
  const SubmitButton = ({ children, pendingText, className }: { children: React.ReactNode, pendingText: string, className?: string }) => {
    const { pending } = useFormStatus();
    return (
      <button type="submit" disabled={pending} className={className}>
        {pending ? pendingText : children}
      </button>
    );
  };


  // --- Formularios para los Modales ---

  const CreateUserForm = () => (
    <form action={(formData) => handleAction(createUser, formData, "Usuario creado")}>
      <div className="space-y-4">
        <input name="name" placeholder="Nombre" required className="w-full p-2 border rounded" />
        <input name="email" type="email" placeholder="Email" required className="w-full p-2 border rounded" />
        <input name="password" type="password" placeholder="Contraseña" required className="w-full p-2 border rounded" />
        <select name="role" defaultValue="user" className="w-full p-2 border rounded">
          <option value="" disabled>Seleccionar Rol</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <input name="reportsLimit" type="number" placeholder="Límite de Reportes (ej. 10)" className="w-full p-2 border rounded" />
        <input name="expiresAt" type="date" placeholder="Fecha de Expiración" className="w-full p-2 border rounded" />
        <SubmitButton pendingText="Creando..." className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:bg-blue-400">Crear Usuario</SubmitButton>
      </div>
    </form>
  );

  const EditUserForm = ({ user }: { user: User }) => (
    <form action={(formData) => handleAction(updateUser, formData, "Usuario actualizado")}>
      <input type="hidden" name="id" value={user.id} />
      <div className="space-y-4">
        <input name="name" defaultValue={user.name || ""} placeholder="Nombre" className="w-full p-2 border rounded" />
        <input name="email" type="email" defaultValue={user.email} placeholder="Email" className="w-full p-2 border rounded" />
        <select name="role" defaultValue={user.role || "user"} className="w-full p-2 border rounded">
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <input name="reportsLimit" type="number" defaultValue={user.reportsLimit} placeholder="Límite de Reportes" className="w-full p-2 border rounded" />
        <input name="expiresAt" type="date" defaultValue={user.expiresAt ? new Date(user.expiresAt).toISOString().split('T')[0] : ""} className="w-full p-2 border rounded" />
        <SubmitButton pendingText="Guardando..." className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:bg-blue-400">Guardar Cambios</SubmitButton>
      </div>
    </form>
  );
  
  const ChangePasswordForm = ({ user }: { user: User }) => (
    <form action={(formData) => handleAction(changeUserPassword, formData, "Contraseña cambiada")}>
      <input type="hidden" name="id" value={user.id} />
      <div className="space-y-4">
        <input name="newPassword" type="password" placeholder="Nueva Contraseña" required className="w-full p-2 border rounded" />
        <SubmitButton pendingText="Cambiando..." className="w-full bg-orange-500 text-white p-2 rounded hover:bg-orange-600 disabled:bg-orange-300">Cambiar Contraseña</SubmitButton>
      </div>
    </form>
  );

  const BanUserForm = ({ user }: { user: User }) => (
     <form action={(formData) => handleAction(toggleUserBan, formData, `Usuario ${user.banned ? 'desbaneado' : 'baneado'}`)}>
        <input type="hidden" name="id" value={user.id} />
        <input type="hidden" name="isBanned" value={String(user.banned)} />
        {!user.banned && <textarea name="banReason" placeholder="Razón del baneo (opcional)" className="w-full p-2 border rounded mb-4"></textarea>}
        <p>¿Estás seguro de que quieres {user.banned ? 'desbanear' : 'banear'} a <strong>{user.name}</strong>?</p>
        <SubmitButton pendingText={user.banned ? 'Desbaneando...' : 'Baneando...'} className={`w-full p-2 rounded mt-4 text-white ${user.banned ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-400' : 'bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300'}`}>
          {user.banned ? 'Sí, desbanear' : 'Sí, banear'}
        </SubmitButton>
    </form>
  );

  const DeleteUserConfirm = ({ user }: { user: User }) => (
    <form action={(formData) => handleAction(deleteUser, formData, "Usuario eliminado")}>
      <input type="hidden" name="id" value={user.id} />
      <p>Esta acción es irreversible. ¿Estás seguro de que quieres eliminar a <strong>{user.name}</strong>?</p>
      <SubmitButton pendingText="Eliminando..." className="w-full bg-red-600 text-white p-2 rounded mt-4 hover:bg-red-700 disabled:bg-red-400">Sí, eliminar permanentemente</SubmitButton>
    </form>
  );

  const SessionHistoryView = ({ userId }: { userId: string }) => {
    const [history, setHistory] = useState<SessionHistory>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      getSessionHistory(userId).then(data => {
        setHistory(data);
        setLoading(false);
      });
    }, [userId]); // Se ejecuta cuando el componente se monta o el userId cambia

    if (loading) return <p>Cargando historial...</p>;

    return (
      <div className="max-h-96 overflow-y-auto">
        {history.length === 0 ? <p>No hay historial de sesiones.</p> : (
          <ul className="space-y-2">
            {history.map(session => (
              <li key={session.id} className="text-sm p-2 border rounded">
                <p><strong>Inicio:</strong> <SafeLocaleDate date={session.createdAt} /></p>
                <p><strong>Duración:</strong> {Math.round(session.duration / 60000)} minutos</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  // Componente para el esqueleto de la tabla
  const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <tr key={index} className="border-b animate-pulse">
          <td className="p-4"><div className="h-4 bg-gray-200 rounded"></div></td>
          <td className="p-4"><div className="h-4 bg-gray-200 rounded"></div></td>
          <td className="p-4"><div className="h-4 w-16 bg-gray-200 rounded"></div></td>
          <td className="p-4"><div className="h-4 w-8 mx-auto bg-gray-200 rounded"></div></td>
          <td className="p-4"><div className="h-4 bg-gray-200 rounded"></div></td>
          <td className="p-4"><div className="h-4 w-8 mx-auto bg-gray-200 rounded"></div></td>
          <td className="p-4"><div className="h-4 bg-gray-200 rounded"></div></td>
          <td className="p-4"><div className="h-4 w-8 mx-auto bg-gray-200 rounded"></div></td>
          <td className="p-4"><div className="h-4 w-16 bg-gray-200 rounded"></div></td>
          <td className="p-4">
            <div className="flex justify-end">
              <div className="h-8 w-8 bg-gray-200 rounded"></div>
            </div>
          </td>
        </tr>
      ))}
    </>
  );


  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Panel de Administración</h1>
          <div className="flex items-center gap-2 md:gap-4 flex-wrap">
            <Link href="/planner" className="bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700">
              Volver a Planner
            </Link>
            <button onClick={handleSignOut} className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700">
              Cerrar Sesión
            </button>
            <button onClick={() => openModal("Crear Nuevo Usuario", () => <CreateUserForm />)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700">
              + Crear Usuario
            </button>
          </div>
        </div>

        {/* Campo de Búsqueda */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-lg p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="bg-white shadow-lg rounded-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[1024px]">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4 font-semibold">Nombre</th>
                <th className="p-4 font-semibold">Email</th>
                <th className="p-4 font-semibold">Rol</th>
                <th className="p-4 font-semibold">Inicios de Sesión</th>
                <th className="p-4 font-semibold">Última vez visto</th>
                <th className="p-4 font-semibold">Límite Reportes</th>
                <th className="p-4 font-semibold">Expira en</th>
                <th className="p-4 font-semibold">Reportes Usados</th>
                <th className="p-4 font-semibold">Estado</th>
                <th className="p-4 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableSkeleton />
              ) : (users.map((user) => (
                <tr 
                  key={user.id} 
                  className={`
                    border-b transition-colors duration-150
                    ${user.banned 
                      ? 'bg-red-50 hover:bg-red-100' 
                      : (user.expiresAt && new Date(user.expiresAt) > new Date() && new Date(user.expiresAt) < new Date(new Date().setDate(new Date().getDate() + 7))) 
                        ? 'bg-yellow-50 hover:bg-yellow-100' 
                        : 'hover:bg-gray-50'
                    }
                  `}
                >
                  <td className="p-4">{user.name}</td>
                  <td className="p-4">{user.email}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.role === 'admin' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4 text-center">{user.loginCount}</td>
                  <td className="p-4"><SafeLocaleDate date={user.lastSeen} /></td>
                  <td className="p-4 text-center">{user.reportsLimit}</td>
                  <td className="p-4"><SafeLocaleDate date={user.expiresAt} /></td>
                  <td className="p-4 text-center">{user.reportsUsed}</td>
                  <td className="p-4">
                     <span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.banned ? 'bg-red-200 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                      {user.banned ? 'Baneado' : 'Activo'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => openModal(`Editar ${user.name}`, () => <EditUserForm user={user} />)}>Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openModal(`Cambiar Contraseña de ${user.name}`, () => <ChangePasswordForm user={user} />)}>Contraseña</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openModal(`Historial de Sesiones de ${user.name}`, () => <SessionHistoryView userId={user.id} />)}>Ver Sesiones</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openModal(user.banned ? `Desbanear a ${user.name}` : `Banear a ${user.name}`, () => <BanUserForm user={user} />)}>{user.banned ? 'Desbanear' : 'Banear'}</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={() => openModal(`Eliminar ${user.name}`, () => <DeleteUserConfirm user={user} />)}>Eliminar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
          {!isLoading && users.length === 0 && (
            <div className="text-center p-8 text-gray-500">
              <p>No se encontraron usuarios que coincidan con la búsqueda.</p>
            </div>
          )}
          </div>
          {/* Controles de Paginación */}
          <div className="flex items-center justify-between p-4 border-t">
            <Button
              onClick={() => {
                const newPage = Math.max(1, currentPage - 1);
                setCurrentPage(newPage);
                refreshUsers(newPage, debouncedSearchTerm);
              }}
              disabled={currentPage === 1 || isLoading}
            >
              Anterior
            </Button>
            <span>Página {currentPage} de {totalPages}</span>
            <Button
              onClick={() => {
                const newPage = Math.min(totalPages, currentPage + 1);
                setCurrentPage(newPage);
                refreshUsers(newPage, debouncedSearchTerm);
              }}
              disabled={currentPage === totalPages || isLoading}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>
      <Modal isOpen={isModalOpen} onClose={closeModal} title={modalTitle}>
        {modalContent && modalContent()}
      </Modal>
    </div>
  );
}
