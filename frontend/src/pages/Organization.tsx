import React, { useState, useEffect, useCallback } from 'react';
import { departmentsApi, employeesApi, assetCategoriesApi } from '../services/api';
import { Department, Employee, AssetCategory } from '../types';

type Tab = 'departments' | 'categories' | 'employees';

interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const emptyMeta: Meta = { total: 0, page: 1, limit: 10, totalPages: 0 };

const Organization: React.FC = () => {
  const [tab, setTab] = useState<Tab>('departments');

  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptMeta, setDeptMeta] = useState<Meta>(emptyMeta);
  const [deptPage, setDeptPage] = useState(1);
  const [loadingDepts, setLoadingDepts] = useState(false);

  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [catMeta, setCatMeta] = useState<Meta>(emptyMeta);
  const [catPage, setCatPage] = useState(1);
  const [loadingCats, setLoadingCats] = useState(false);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empMeta, setEmpMeta] = useState<Meta>(emptyMeta);
  const [empPage, setEmpPage] = useState(1);
  const [loadingEmps, setLoadingEmps] = useState(false);

  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showEmpModal, setShowEmpModal] = useState(false);

  const [deptForm, setDeptForm] = useState({ name: '', code: '', description: '', departmentHead: '', parentDepartment: '' });
  const [catForm, setCatForm] = useState({ name: '', code: '', description: '' });
  const [empForm, setEmpForm] = useState({ firstName: '', lastName: '', email: '', employeeCode: '', designation: '', departmentId: '' });

  const fetchDepartments = useCallback(async (page: number) => {
    setLoadingDepts(true);
    try {
      const res = await departmentsApi.getAll({ page, limit: 10 });
      setDepartments(res.data);
      setDeptMeta(res.meta);
    } catch (e) { console.error(e); }
    setLoadingDepts(false);
  }, []);

  const fetchCategories = useCallback(async (page: number) => {
    setLoadingCats(true);
    try {
      const res = await assetCategoriesApi.getAll({ page, limit: 10 });
      setCategories(res.data);
      setCatMeta(res.meta);
    } catch (e) { console.error(e); }
    setLoadingCats(false);
  }, []);

  const fetchEmployees = useCallback(async (page: number) => {
    setLoadingEmps(true);
    try {
      const res = await employeesApi.getAll({ page, limit: 10 });
      setEmployees(res.data);
      setEmpMeta(res.meta);
    } catch (e) { console.error(e); }
    setLoadingEmps(false);
  }, []);

  useEffect(() => {
    if (tab === 'departments') fetchDepartments(deptPage);
    else if (tab === 'categories') fetchCategories(catPage);
    else fetchEmployees(empPage);
  }, [tab, deptPage, catPage, empPage, fetchDepartments, fetchCategories, fetchEmployees]);

  const handleCreateDept = async () => {
    try {
      const payload: { name: string; code: string; description?: string; departmentHead?: string; parentDepartment?: string } = {
        name: deptForm.name,
        code: deptForm.code,
      };
      if (deptForm.description) payload.description = deptForm.description;
      if (deptForm.departmentHead) payload.departmentHead = deptForm.departmentHead;
      if (deptForm.parentDepartment) payload.parentDepartment = deptForm.parentDepartment;
      await departmentsApi.create(payload);
      setShowDeptModal(false);
      setDeptForm({ name: '', code: '', description: '', departmentHead: '', parentDepartment: '' });
      fetchDepartments(deptPage);
    } catch (e) { console.error(e); }
  };

  const handleCreateCategory = async () => {
    try {
      const payload: { name: string; code: string; description?: string } = {
        name: catForm.name,
        code: catForm.code,
      };
      if (catForm.description) payload.description = catForm.description;
      await assetCategoriesApi.create(payload);
      setShowCatModal(false);
      setCatForm({ name: '', code: '', description: '' });
      fetchCategories(catPage);
    } catch (e) { console.error(e); }
  };

  const handleCreateEmployee = async () => {
    try {
      const payload: Record<string, unknown> = {
        firstName: empForm.firstName,
        lastName: empForm.lastName,
        email: empForm.email,
        employeeCode: empForm.employeeCode,
        designation: empForm.designation,
      };
      if (empForm.departmentId) payload.departmentId = empForm.departmentId;
      await employeesApi.create(payload);
      setShowEmpModal(false);
      setEmpForm({ firstName: '', lastName: '', email: '', employeeCode: '', designation: '', departmentId: '' });
      fetchEmployees(empPage);
    } catch (e) { console.error(e); }
  };

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-gray-100 text-gray-700',
      on_leave: 'bg-amber-100 text-amber-700',
      terminated: 'bg-red-100 text-red-700',
    };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[s] || 'bg-gray-100 text-gray-700'}`}>{s}</span>;
  };

  const Pagination: React.FC<{ meta: Meta; onPageChange: (p: number) => void }> = ({ meta, onPageChange }) => (
    <div className="flex items-center justify-between mt-4">
      <span className="text-sm text-gray-600">Showing {((meta.page - 1) * meta.limit) + 1} to {Math.min(meta.page * meta.limit, meta.total)} of {meta.total}</span>
      <div className="flex gap-1">
        <button disabled={meta.page <= 1} onClick={() => onPageChange(meta.page - 1)} className="px-3 py-1 border rounded text-sm disabled:opacity-50">Prev</button>
        {Array.from({ length: meta.totalPages }, (_, i) => (
          <button key={i + 1} onClick={() => onPageChange(i + 1)} className={`px-3 py-1 border rounded text-sm ${meta.page === i + 1 ? 'bg-primary text-white' : ''}`}>{i + 1}</button>
        ))}
        <button disabled={meta.page >= meta.totalPages} onClick={() => onPageChange(meta.page + 1)} className="px-3 py-1 border rounded text-sm disabled:opacity-50">Next</button>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Organization Management</h1>

      <div className="flex gap-4 border-b mb-6">
        {(['departments', 'categories', 'employees'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`pb-2 px-4 text-sm font-medium border-b-2 transition ${tab === t ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'departments' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowDeptModal(true)} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">Add Department</button>
          </div>
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium">Code</th>
                  <th className="text-left px-4 py-3 font-medium">Head</th>
                  <th className="text-left px-4 py-3 font-medium">Employees</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingDepts ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
                ) : departments.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No departments found</td></tr>
                ) : departments.map(d => (
                  <tr key={d.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{d.name}</td>
                    <td className="px-4 py-3 text-gray-600">{d.code}</td>
                    <td className="px-4 py-3 text-gray-600">{d.departmentHead || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{d.employeeCount}</td>
                    <td className="px-4 py-3">{statusBadge(d.status)}</td>
                    <td className="px-4 py-3">
                      <button className="text-primary hover:underline text-sm mr-3">Edit</button>
                      <button className="text-red-500 hover:underline text-sm">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={deptMeta} onPageChange={setDeptPage} />
        </div>
      )}

      {tab === 'categories' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowCatModal(true)} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">Add Category</button>
          </div>
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium">Code</th>
                  <th className="text-left px-4 py-3 font-medium">Type</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingCats ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
                ) : categories.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No categories found</td></tr>
                ) : categories.map(c => (
                  <tr key={c.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-gray-600">{c.code}</td>
                    <td className="px-4 py-3 text-gray-600">{c.categoryType || '-'}</td>
                    <td className="px-4 py-3">{statusBadge(c.status)}</td>
                    <td className="px-4 py-3">
                      <button className="text-primary hover:underline text-sm mr-3">Edit</button>
                      <button className="text-red-500 hover:underline text-sm">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={catMeta} onPageChange={setCatPage} />
        </div>
      )}

      {tab === 'employees' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowEmpModal(true)} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">Add Employee</button>
          </div>
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Code</th>
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-left px-4 py-3 font-medium">Department</th>
                  <th className="text-left px-4 py-3 font-medium">Designation</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingEmps ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
                ) : employees.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No employees found</td></tr>
                ) : employees.map(e => (
                  <tr key={e.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">{e.employeeCode}</td>
                    <td className="px-4 py-3 font-medium">{e.fullName}</td>
                    <td className="px-4 py-3 text-gray-600">{e.email}</td>
                    <td className="px-4 py-3 text-gray-600">{e.departmentId || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{e.designation}</td>
                    <td className="px-4 py-3">{statusBadge(e.employmentStatus)}</td>
                    <td className="px-4 py-3">
                      <button className="text-primary hover:underline text-sm mr-3">Edit</button>
                      <button className="text-red-500 hover:underline text-sm">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={empMeta} onPageChange={setEmpPage} />
        </div>
      )}

      {showDeptModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Add Department</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input value={deptForm.name} onChange={e => setDeptForm(p => ({ ...p, name: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                <input value={deptForm.code} onChange={e => setDeptForm(p => ({ ...p, code: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={deptForm.description} onChange={e => setDeptForm(p => ({ ...p, description: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department Head</label>
                <select value={deptForm.departmentHead} onChange={e => setDeptForm(p => ({ ...p, departmentHead: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Select employee...</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parent Department</label>
                <select value={deptForm.parentDepartment} onChange={e => setDeptForm(p => ({ ...p, parentDepartment: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">None</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowDeptModal(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleCreateDept} disabled={!deptForm.name || !deptForm.code} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">Create</button>
            </div>
          </div>
        </div>
      )}

      {showCatModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Add Category</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                <input value={catForm.code} onChange={e => setCatForm(p => ({ ...p, code: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={catForm.description} onChange={e => setCatForm(p => ({ ...p, description: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCatModal(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleCreateCategory} disabled={!catForm.name || !catForm.code} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">Create</button>
            </div>
          </div>
        </div>
      )}

      {showEmpModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Add Employee</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input value={empForm.firstName} onChange={e => setEmpForm(p => ({ ...p, firstName: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input value={empForm.lastName} onChange={e => setEmpForm(p => ({ ...p, lastName: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" value={empForm.email} onChange={e => setEmpForm(p => ({ ...p, email: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee Code *</label>
                <input value={empForm.employeeCode} onChange={e => setEmpForm(p => ({ ...p, employeeCode: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Designation *</label>
                <input value={empForm.designation} onChange={e => setEmpForm(p => ({ ...p, designation: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <select value={empForm.departmentId} onChange={e => setEmpForm(p => ({ ...p, departmentId: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Select department...</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowEmpModal(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleCreateEmployee} disabled={!empForm.firstName || !empForm.lastName || !empForm.email || !empForm.employeeCode || !empForm.designation} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { Organization };
export default Organization;
