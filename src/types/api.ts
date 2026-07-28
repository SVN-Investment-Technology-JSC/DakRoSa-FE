export interface ApiEnvelope<T> {
  success: true;
  data: T;
}

export interface ApiErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string | string[];
  };
}

export interface ApiRequestOptions {
  retryUnauthorized?: boolean;
  auth?: boolean;
}
