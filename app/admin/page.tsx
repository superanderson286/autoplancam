import React from 'react';
import { auth } from '../lib/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

const AdminDashboard = async () => {
  const session = await auth.api.getSession({ headers: headers() });

  if (!session || session.user.role !== 'admin') {
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
