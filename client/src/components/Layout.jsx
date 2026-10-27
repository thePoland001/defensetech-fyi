import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useUnlock } from '../api.jsx';
import { Logo } from './Bits.jsx';
import CompanySearch from './CompanySearch.jsx';
import { BuildingIcon, CapIcon, CheckIcon, MoneyIcon, PinIcon, PlusIcon, ShieldIcon } from './Icons.jsx';

const NAV = [
  { to: '/salaries', label: 'Salaries', icon: MoneyIcon },
  { to: '/companies', label: 'Companies', icon: BuildingIcon },
  { to: '/internships', label: 'Internships', icon: CapIcon },
  { to: '/clearances', label: 'Clearances', icon: ShieldIcon },
];

export default function Layout() {
  const { pathname } = useLocation();
  const { unlocked } = useUnlock();
  useEffect(() => window.scrollTo(0, 0), [pathname]);

  return (
    <>
      <header className="site-header">
        <div className="header-top container">
          <Logo />
          <div className="header-search">
            <CompanySearch variant="header" placeholder="Search companies" />
          </div>
          <div className="header-actions">
            <Link to="/about" className="header-link">About</Link>
            <Link to="/add-salary" className="btn btn-primary btn-sm">
              <PlusIcon size={16} /> <span>Add Salary</span>
            </Link>
          </div>
        </div>
        <nav className="header-nav">
          <div className="container nav-inner">
            <div className="nav-links">
              {NAV.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <Icon size={17} /> {label}
                </NavLink>
              ))}
            </div>
            <div className="nav-meta">
              {unlocked && <span className="unlocked-chip"><CheckIcon size={14} /> Data unlocked</span>}
              <span className="loc-chip"><PinIcon size={14} /> Huntsville, AL</span>
            </div>
          </div>
        </nav>
      </header>

      <main className="site-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <Logo />
            <p>Anonymous compensation and clearance data for the defense companies of Huntsville, Alabama. Built for engineers, by engineers.</p>
          </div>
          <div className="footer-cols">
            <div>
              <h4>Explore</h4>
              <Link to="/salaries">Salaries</Link>
              <Link to="/companies">Companies</Link>
              <Link to="/internships">Internships</Link>
              <Link to="/clearances">Clearances</Link>
            </div>
            <div>
              <h4>Contribute</h4>
              <Link to="/add-salary">Add your salary</Link>
              <Link to="/about#methodology">How data works</Link>
              <Link to="/about#privacy">Privacy</Link>
            </div>
          </div>
        </div>
        <div className="container footer-legal">
          © {new Date().getFullYear()} defensetech.fyi · Not affiliated with any company listed. Pay data is self-reported or estimated and is not verified. Never share classified or controlled information.
        </div>
      </footer>
    </>
  );
}
