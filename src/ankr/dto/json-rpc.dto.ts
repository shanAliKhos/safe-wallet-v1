export interface JsonRpcRequest<T = any> {
  id: number;
  jsonrpc: '2.0';
  method: string;
  params?: T;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: any;
}

export interface JsonRpcResponse<T = any> {
  id: number;
  jsonrpc: '2.0';
  result?: T;
  error?: JsonRpcError;
}

