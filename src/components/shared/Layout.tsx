import { Outlet } from 'react-router-dom';
import Navigation from './Navigation';

const Layout = () => {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <Navigation />
      <main className="py-4">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
