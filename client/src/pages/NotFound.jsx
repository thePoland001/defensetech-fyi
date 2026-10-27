import { Link } from 'react-router-dom';
import { usePageTitle } from './usePageTitle.js';

export default function NotFound() {
  usePageTitle('Not found');
  return (
    <div className="container page narrow">
      <div className="card empty-company">
        <h1>Page not found</h1>
        <p>That page doesn't exist, or the company may have been renamed.</p>
        <Link to="/companies" className="btn btn-primary">Browse companies</Link>
      </div>
    </div>
  );
}
