import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppProvider } from './api.jsx';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Companies from './pages/Companies.jsx';
import Company from './pages/Company.jsx';
import Compare from './pages/Compare.jsx';
import Salaries from './pages/Salaries.jsx';
import Internships from './pages/Internships.jsx';
import Clearances from './pages/Clearances.jsx';
import AddSalary from './pages/AddSalary.jsx';
import About from './pages/About.jsx';
import Admin from './pages/Admin.jsx';
import NotFound from './pages/NotFound.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="companies" element={<Companies />} />
            <Route path="companies/:slug" element={<Company />} />
            <Route path="compare" element={<Compare />} />
            <Route path="salaries" element={<Salaries />} />
            <Route path="internships" element={<Internships />} />
            <Route path="clearances" element={<Clearances />} />
            <Route path="add-salary" element={<AddSalary />} />
            <Route path="about" element={<About />} />
            <Route path="admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  </React.StrictMode>,
);
