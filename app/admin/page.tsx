import React from 'react';
import { auth } from '../../lib/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getUsers } from '@/app/admin/actions';
import AdminClient from '@/app/admin/AdminClient';


const AdminDashboard = async () => {
  // 1. Verificación de seguridad en el servidor
  const session = await auth.api.getSession({ headers: new Headers(await headers()) });

  const user = session?.user;
  if (!session || user?.role !== 'admin') {
    redirect('/auth/sign-in'); // Redirige al login si no es admin
  }

  // 2. Obtención de los datos iniciales en el servidor
  const initialData = await getUsers({ page: 1, searchTerm: '' });

  return (
    // 3. Renderiza el componente de cliente pasándole los datos
    // El componente de cliente se encargará de toda la interactividad.
    <AdminClient initialData={initialData} />
  );
};

export default AdminDashboard;
