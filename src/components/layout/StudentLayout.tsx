import { Outlet } from 'react-router-dom';
import { Header } from './Header';

export const StudentLayout = () => {
  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden">
      {/* Reusing Header since it adapts to roles and doesn't show admin menus */}
      <Header hideLogo={false} />
      <main className="flex-1 overflow-y-auto flex flex-col min-h-0 p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
};
