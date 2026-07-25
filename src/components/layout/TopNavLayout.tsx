import { Outlet } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';

export const TopNavLayout = () => {
  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto flex flex-col min-h-0">
        <Outlet />
      </main>
    </div>
  );
};
