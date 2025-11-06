import React from 'react';
//import { auth } from '../../../../lib/auth/auth';
import { auth } from '../../lib/auth';
//import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation.js';
import { headers } from 'next/headers.js';
import type { UserWithRole } from 'better-auth/plugins/admin';

const AdminDashboard = async () => {
  const session = await auth.api.getSession({ headers: new Headers(await headers()) });

  const user = session?.user as UserWithRole | undefined;
  if (!session || user?.role !== 'admin') {
    redirect('/planner');
  }

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>Welcome to the admin dashboard!</p>
    </div>
  );
};

export default AdminDashboard;
