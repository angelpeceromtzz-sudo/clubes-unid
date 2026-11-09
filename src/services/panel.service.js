import { request } from './api-core';

export const panelService = {
  getPanelData: () => request('/admin/panel-data'),
};
