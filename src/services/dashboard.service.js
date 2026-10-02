import { request } from './api-core';

export const dashboardService = {
  getDashboardData: () => request('/admin/dashboard-data'),
};
