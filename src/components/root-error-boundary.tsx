import { Component, type ErrorInfo, type ReactNode } from 'react';

type RootErrorBoundaryProps = {
  children: ReactNode;
};

type RootErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

export class RootErrorBoundary extends Component<
  RootErrorBoundaryProps,
  RootErrorBoundaryState
> {
  constructor(props: RootErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): RootErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '2rem',
            fontFamily: 'system-ui, sans-serif',
            maxWidth: '42rem',
          }}
        >
          <h1 style={{ marginTop: 0 }}>화면을 그리는 중 오류가 났습니다</h1>
          <p style={{ color: '#475569' }}>
            브라우저 개발자 도구(F12) → Console 탭의 빨간 메시지를 확인해 주세요.
          </p>
          <pre
            style={{
              padding: '1rem',
              background: '#f1f5f9',
              borderRadius: '8px',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
            }}
          >
            {this.state.message}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}
