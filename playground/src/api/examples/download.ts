import type { RequestResponse } from '@vben/request';

import { requestClient } from '../request';

/**
 * 下载文件，获取Blob
 * @returns Blob
 */
async function downloadFile1() {
  return requestClient.download<Blob>(
    'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2064%2064%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2212%22%20fill%3D%22%232563eb%22%2F%3E%3Crect%20x%3D%2214%22%20y%3D%2217%22%20width%3D%2215%22%20height%3D%2230%22%20rx%3D%224%22%20fill%3D%22%23fff%22%2F%3E%3Crect%20x%3D%2235%22%20y%3D%2217%22%20width%3D%2215%22%20height%3D%2213%22%20rx%3D%224%22%20fill%3D%22%23bfdbfe%22%2F%3E%3Crect%20x%3D%2235%22%20y%3D%2235%22%20width%3D%2215%22%20height%3D%2212%22%20rx%3D%224%22%20fill%3D%22%23fff%22%2F%3E%3C%2Fsvg%3E',
  );
}

/**
 * 下载文件，获取完整的Response
 * @returns RequestResponse<Blob>
 */
async function downloadFile2() {
  return requestClient.download<RequestResponse<Blob>>(
    'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2064%2064%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2212%22%20fill%3D%22%232563eb%22%2F%3E%3Crect%20x%3D%2214%22%20y%3D%2217%22%20width%3D%2215%22%20height%3D%2230%22%20rx%3D%224%22%20fill%3D%22%23fff%22%2F%3E%3Crect%20x%3D%2235%22%20y%3D%2217%22%20width%3D%2215%22%20height%3D%2213%22%20rx%3D%224%22%20fill%3D%22%23bfdbfe%22%2F%3E%3Crect%20x%3D%2235%22%20y%3D%2235%22%20width%3D%2215%22%20height%3D%2212%22%20rx%3D%224%22%20fill%3D%22%23fff%22%2F%3E%3C%2Fsvg%3E',
    {
      responseReturn: 'raw',
    },
  );
}

export { downloadFile1, downloadFile2 };
