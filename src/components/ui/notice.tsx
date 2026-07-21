interface NoticeProps {
  tone?: 'success' | 'error' | 'info';
  children: React.ReactNode;
}

export function Notice({ tone = 'info', children }: NoticeProps) {
  return <div className={`notice notice-${tone}`}>{children}</div>;
}

