'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Users, MapPin, Search, X } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { departmentService } from '@/lib/services/department.service';
import { employeeService } from '@/lib/services/employee.service';
import { Department, DepartmentRequest, Employee, DepartmentType } from '@/lib/types/employee';
import { useAuth } from '@/lib/hooks/useAuth';

export default function DepartmentsPage() {
  const router = useRouter();
  const { isAuthenticated, hasHydrated } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState<DepartmentRequest>({
    code: '',
    name: '',
    description: '',
    parentDepartmentId: undefined,
    managerId: '',
    isActive: true,
    location: '',
    costCenter: '',
    type: undefined,
  });

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
    } else {
      loadData();
    }
  }, [hasHydrated, isAuthenticated, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [deptResponse, empResponse] = await Promise.all([
        departmentService.getAllDepartments(0, 100),
        employeeService.getAllEmployees(0, 500),
      ]);
      setDepartments(deptResponse.content);
      setEmployees(empResponse.content);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load departments');
      console.error('Error loading departments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);

      const submitData: DepartmentRequest = {
        code: formData.code,
        name: formData.name,
        description: formData.description || undefined,
        parentDepartmentId: formData.parentDepartmentId || undefined,
        managerId: formData.managerId || undefined,
        isActive: formData.isActive,
        location: formData.location || undefined,
        costCenter: formData.costCenter || undefined,
        type: formData.type || undefined,
      };

      if (editingDepartment) {
        await departmentService.updateDepartment(editingDepartment.id, submitData);
      } else {
        await departmentService.createDepartment(submitData);
      }

      await loadData();
      resetForm();
      setShowAddModal(false);
      setEditingDepartment(null);
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to ${editingDepartment ? 'update' : 'create'} department`);
      console.error('Error saving department:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      parentDepartmentId: undefined,
      managerId: '',
      isActive: true,
      location: '',
      costCenter: '',
      type: undefined,
    });
  };

  const handleEdit = (department: Department) => {
    setEditingDepartment(department);
    setFormData({
      code: department.code,
      name: department.name,
      description: department.description || '',
      parentDepartmentId: department.parentDepartmentId,
      managerId: department.managerId || '',
      isActive: department.isActive,
      location: department.location || '',
      costCenter: department.costCenter || '',
      type: department.type,
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return;

    try {
      setError(null);
      await departmentService.deleteDepartment(id);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete department');
      console.error('Error deleting department:', err);
    }
  };

  const handleToggleActive = async (department: Department) => {
    try {
      setError(null);
      if (department.isActive) {
        await departmentService.deactivateDepartment(department.id);
      } else {
        await departmentService.activateDepartment(department.id);
      }
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update department status');
      console.error('Error toggling department status:', err);
    }
  };

  const departmentTypes: DepartmentType[] = [
    'ENGINEERING', 'PRODUCT', 'DESIGN', 'MARKETING', 'SALES',
    'OPERATIONS', 'FINANCE', 'HR', 'LEGAL', 'ADMIN', 'SUPPORT', 'OTHER'
  ];

  const filteredDepartments = departments.filter((dept) =>
    dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dept.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (dept.type && dept.type.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalEmployees = departments.reduce((sum, dept) => sum + (dept.employeeCount || 0), 0);
  const activeDepartments = departments.filter(d => d.isActive).length;

  return (
    <AppLayout activeMenuItem="departments">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">Departments</h1>
            <p className="text-surface-500 dark:text-surface-400 mt-1">
              Manage your organization's departments and structure
            </p>
          </div>
          <Button
            variant="primary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => {
              resetForm();
              setEditingDepartment(null);
              setShowAddModal(true);
            }}
          >
            Add Department
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-white dark:bg-surface-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-surface-500 dark:text-surface-400">Total Departments</p>
                  <p className="text-3xl font-bold text-surface-900 dark:text-surface-50 mt-1">{departments.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-950/30 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-surface-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-surface-500 dark:text-surface-400">Active Departments</p>
                  <p className="text-3xl font-bold text-surface-900 dark:text-surface-50 mt-1">{activeDepartments}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-950/30 flex items-center justify-center">
                  <ToggleRight className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-surface-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-surface-500 dark:text-surface-400">Total Employees</p>
                  <p className="text-3xl font-bold text-surface-900 dark:text-surface-50 mt-1">{totalEmployees}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Search and Filter */}
        <Card className="bg-white dark:bg-surface-900">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
              <input
                type="text"
                placeholder="Search departments by name, code, or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-surface-200 dark:border-surface-700 rounded-xl bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 placeholder-surface-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </CardContent>
        </Card>

        {/* Departments Table */}
        <Card className="bg-white dark:bg-surface-900">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-200 dark:border-surface-700">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                      Parent
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                      Manager
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                      Employees
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
                          <span className="text-surface-500 dark:text-surface-400">Loading departments...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredDepartments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-16 h-16 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
                            <Building2 className="h-8 w-8 text-surface-400" />
                          </div>
                          <div>
                            <p className="text-surface-900 dark:text-surface-50 font-medium">No departments found</p>
                            <p className="text-surface-500 dark:text-surface-400 text-sm mt-1">
                              {searchQuery ? 'Try a different search term' : 'Click "Add Department" to get started'}
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredDepartments.map((dept) => (
                      <tr key={dept.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/30 flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                            </div>
                            <div>
                              <p className="font-medium text-surface-900 dark:text-surface-50">{dept.name}</p>
                              <p className="text-sm text-surface-500 dark:text-surface-400">{dept.code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {dept.type ? (
                            <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400">
                              {dept.type}
                            </span>
                          ) : (
                            <span className="text-surface-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-surface-900 dark:text-surface-50">
                          {dept.parentDepartmentName || '-'}
                        </td>
                        <td className="px-6 py-4 text-surface-900 dark:text-surface-50">
                          {dept.managerName || '-'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-surface-400" />
                            <span className="text-surface-900 dark:text-surface-50">{dept.employeeCount || 0}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                            dept.isActive
                              ? 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400'
                              : 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400'
                          }`}>
                            {dept.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(dept)}
                              className="p-2 rounded-lg text-surface-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/30 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleToggleActive(dept)}
                              className="p-2 rounded-lg text-surface-500 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950/30 transition-colors"
                              title={dept.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {dept.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => handleDelete(dept.id)}
                              className="p-2 rounded-lg text-surface-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Add/Edit Department Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-surface-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-6 border-b border-surface-200 dark:border-surface-700">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/30 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <h2 className="text-xl font-bold text-surface-900 dark:text-surface-50">
                      {editingDepartment ? 'Edit Department' : 'Add New Department'}
                    </h2>
                  </div>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingDepartment(null);
                      resetForm();
                    }}
                    className="p-2 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                      Department Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full px-4 py-2.5 border border-surface-200 dark:border-surface-700 rounded-xl bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="ENG, HR, FIN"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                      Department Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2.5 border border-surface-200 dark:border-surface-700 rounded-xl bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Engineering"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-surface-200 dark:border-surface-700 rounded-xl bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    placeholder="Department description..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                      Department Type
                    </label>
                    <select
                      value={formData.type || ''}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as DepartmentType })}
                      className="w-full px-4 py-2.5 border border-surface-200 dark:border-surface-700 rounded-xl bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">Select Type</option>
                      {departmentTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                      Parent Department
                    </label>
                    <select
                      value={formData.parentDepartmentId || ''}
                      onChange={(e) => setFormData({ ...formData, parentDepartmentId: e.target.value })}
                      className="w-full px-4 py-2.5 border border-surface-200 dark:border-surface-700 rounded-xl bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">None (Root Department)</option>
                      {departments
                        .filter(d => !editingDepartment || d.id !== editingDepartment.id)
                        .map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name} ({dept.code})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                      Department Manager
                    </label>
                    <select
                      value={formData.managerId || ''}
                      onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                      className="w-full px-4 py-2.5 border border-surface-200 dark:border-surface-700 rounded-xl bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">Select Manager</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.fullName} ({emp.employeeCode})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                      Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-4 py-2.5 border border-surface-200 dark:border-surface-700 rounded-xl bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Building A, Floor 2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                      Cost Center
                    </label>
                    <input
                      type="text"
                      value={formData.costCenter}
                      onChange={(e) => setFormData({ ...formData, costCenter: e.target.value })}
                      className="w-full px-4 py-2.5 border border-surface-200 dark:border-surface-700 rounded-xl bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="CC-1001"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center cursor-pointer p-2.5 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-surface-300 dark:border-surface-600 rounded"
                      />
                      <span className="ml-3 text-sm font-medium text-surface-700 dark:text-surface-300">Active Department</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-surface-200 dark:border-surface-700">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingDepartment(null);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary">
                    {editingDepartment ? 'Update' : 'Create'} Department
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
