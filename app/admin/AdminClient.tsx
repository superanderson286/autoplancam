// c:\Users\super\Documents\autoplancam\app\admin\AdminClient.tsx
"use client";

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
import { useState } from "react";
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
import { SafeLocaleDate } from "../../components/SafeLocaleDate";

// Define el tipo para los usuarios que recibimos del servidor.
type User = Awaited<ReturnType<typeof getUsers>>[0];
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

export default function AdminClient({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<React.ReactNode | null>(null);
  const [modalTitle, setModalTitle] = useState("");

  // 1. Función para refrescar la lista de usuarios desde el servidor
  const refreshUsers = async () => {
    try {
      const updatedUsers = await getUsers();
      setUsers(updatedUsers);
    } catch (error) {
      toast.error("Error al refrescar la lista de usuarios.");
    }
  };

  const handleAction = async (action: (formData: FormData) => Promise<any>, formData: FormData, successMessage: string) => {
    const result = await action(formData);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success(result?.success || successMessage);
      await refreshUsers(); // 2. Llama a la función de refresco después de una acción exitosa
      closeModal();
    }
  };

  const openModal = (title: string, content: React.ReactNode) => {
    setModalTitle(title);
    setModalContent(content);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalContent(null);
  };

  // --- Formularios para los Modales ---

  const CreateUserForm = () => (
    <form action={(formData) => handleAction(createUser, formData, "Usuario creado")}>
      <div className="space-y-4">
        <input name="name" placeholder="Nombre" required className="w-full p-2 border rounded" />
        <input name="email" type="email" placeholder="Email" required className="w-full p-2 border rounded" />
        <input name="password" type="password" placeholder="Contraseña" required className="w-full p-2 border rounded" />
        <select name="role" defaultValue="user" className="w-full p-2 border rounded">
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">Crear Usuario</button>
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
        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">Guardar Cambios</button>
      </div>
    </form>
  );
  
  const ChangePasswordForm = ({ user }: { user: User }) => (
    <form action={(formData) => handleAction(changeUserPassword, formData, "Contraseña cambiada")}>
      <input type="hidden" name="id" value={user.id} />
      <div className="space-y-4">
        <input name="newPassword" type="password" placeholder="Nueva Contraseña" required className="w-full p-2 border rounded" />
        <button type="submit" className="w-full bg-orange-500 text-white p-2 rounded hover:bg-orange-600">Cambiar Contraseña</button>
      </div>
    </form>
  );

  const BanUserForm = ({ user }: { user: User }) => (
     <form action={(formData) => handleAction(toggleUserBan, formData, `Usuario ${user.banned ? 'desbaneado' : 'baneado'}`)}>
        <input type="hidden" name="id" value={user.id} />
        <input type="hidden" name="isBanned" value={String(user.banned)} />
        {!user.banned && <textarea name="banReason" placeholder="Razón del baneo (opcional)" className="w-full p-2 border rounded mb-4"></textarea>}
        <p>¿Estás seguro de que quieres {user.banned ? 'desbanear' : 'banear'} a <strong>{user.name}</strong>?</p>
        <button type="submit" className={`w-full p-2 rounded mt-4 text-white ${user.banned ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-500 hover:bg-yellow-600'}`}>
          {user.banned ? 'Sí, desbanear' : 'Sí, banear'}
        </button>
    </form>
  );

  const DeleteUserConfirm = ({ user }: { user: User }) => (
    <form action={(formData) => handleAction(deleteUser, formData, "Usuario eliminado")}>
      <input type="hidden" name="id" value={user.id} />
      <p>Esta acción es irreversible. ¿Estás seguro de que quieres eliminar a <strong>{user.name}</strong>?</p>
      <button type="submit" className="w-full bg-red-600 text-white p-2 rounded mt-4 hover:bg-red-700">Sí, eliminar permanentemente</button>
    </form>
  );

  const SessionHistoryView = ({ userId }: { userId: string }) => {
    const [history, setHistory] = useState<SessionHistory>([]);
    const [loading, setLoading] = useState(true);

    useState(() => {
      getSessionHistory(userId).then(data => {
        setHistory(data);
        setLoading(false);
      });
    });

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

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Panel de Administración</h1>
          <button onClick={() => openModal("Crear Nuevo Usuario", <CreateUserForm />)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700">
            + Crear Usuario
          </button>
        </div>

        <div className="bg-white shadow-lg rounded-lg overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4 font-semibold">Nombre</th>
                <th className="p-4 font-semibold">Email</th>
                <th className="p-4 font-semibold">Rol</th>
                <th className="p-4 font-semibold">Inicios de Sesión</th>
                <th className="p-4 font-semibold">Última vez visto</th>
                <th className="p-4 font-semibold">Estado</th>
                <th className="p-4 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">{user.name}</td>
                  <td className="p-4">{user.email}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.role === 'admin' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4 text-center">{user.loginCount}</td>
                  <td className="p-4"><SafeLocaleDate date={user.lastSeen} /></td>
                  <td className="p-4">
                     <span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.banned ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
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
                        <DropdownMenuItem onClick={() => openModal(`Editar ${user.name}`, <EditUserForm user={user} />)}>Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openModal(`Cambiar Contraseña de ${user.name}`, <ChangePasswordForm user={user} />)}>Contraseña</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openModal(`Historial de Sesiones de ${user.name}`, <SessionHistoryView userId={user.id} />)}>Ver Sesiones</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openModal(user.banned ? `Desbanear a ${user.name}` : `Banear a ${user.name}`, <BanUserForm user={user} />)}>{user.banned ? 'Desbanear' : 'Banear'}</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={() => openModal(`Eliminar ${user.name}`, <DeleteUserConfirm user={user} />)}>Eliminar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Modal isOpen={isModalOpen} onClose={closeModal} title={modalTitle}>
        {modalContent}
      </Modal>
    </div>
  );
}
