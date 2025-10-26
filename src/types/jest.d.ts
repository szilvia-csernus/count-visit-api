// TypeScript declarations for Jest unstable APIs
declare namespace jest {
  interface MockOptions {
    virtual?: boolean;
  }

  function unstable_mockModule<T = unknown>(
    moduleName: string, 
    factory?: () => T | Promise<T>, 
    options?: MockOptions
  ): typeof jest;
}