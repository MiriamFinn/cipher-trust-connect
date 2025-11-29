import { useEffect } from 'react';

/**
 * Client component to block Coinbase analytics requests
 * This must run before any Coinbase SDK initialization
 */
export function CoinbaseAnalyticsBlocker() {
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined' || typeof XMLHttpRequest === 'undefined') {
      return;
    }

    // Set flag to disable telemetry (if SDK checks for it)
    (window as unknown as Record<string, unknown>).__COINBASE_SDK_DISABLE_TELEMETRY__ = true;
    (window as unknown as Record<string, unknown>).__DISABLE_COINBASE_ANALYTICS__ = true;

    // Intercept fetch requests
    const originalFetch = window.fetch;
    window.fetch = function(this: Window, ...args: Parameters<typeof fetch>) {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url || '';
      
      // Block Coinbase analytics endpoints
      if (url && (
        url.includes('cca-lite.coinbase.com/metrics') ||
        url.includes('cca-lite.coinbase.com/amp') ||
        url.includes('coinbase.com') && (url.includes('/metrics') || url.includes('/amp') || url.includes('/analytics'))
      )) {
        // Return a mock successful response to prevent error propagation
        // This prevents the SDK from logging errors to console
        return Promise.resolve(new Response(JSON.stringify({ blocked: true }), {
          status: 200,
          statusText: 'OK',
          headers: { 'Content-Type': 'application/json' }
        }));
      }
      
      return originalFetch.apply(this, args);
    };

    // Intercept XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    XMLHttpRequest.prototype.open = function(this: XMLHttpRequest, ...args: any[]) {
      const url = args[1];
      (this as unknown as Record<string, unknown>)._url = url.toString();
      // Use apply to handle optional parameters correctly
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return originalXHROpen.apply(this, args as any);
    } as typeof XMLHttpRequest.prototype.open;
    
    XMLHttpRequest.prototype.send = function(this: XMLHttpRequest, body?: Document | XMLHttpRequestBodyInit | null) {
      const url = (this as unknown as Record<string, unknown>)._url as string;
      
      if (url && (
        url.includes('cca-lite.coinbase.com/metrics') ||
        url.includes('cca-lite.coinbase.com/amp')
      )) {
        // Silently block
        return;
      }
      
      return originalXHRSend.call(this, body);
    };

    // Cleanup function
    return () => {
      window.fetch = originalFetch;
      XMLHttpRequest.prototype.open = originalXHROpen;
      XMLHttpRequest.prototype.send = originalXHRSend;
    };
  }, []);

  return null; // This component doesn't render anything
}

