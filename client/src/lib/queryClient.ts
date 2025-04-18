import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

export async function downloadFileFromApi(
  url: string,
  filename: string
): Promise<void> {
  const res = await fetch(url, {
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function parseCSV(text: string): Array<Record<string, string>> {
  // Normalize line endings and remove any BOM character
  const normalizedText = text.replace(/^\ufeff/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Clean up the text - fix common issues
  let cleanedText = normalizedText;
  
  // If the CSV has no line breaks but has expected headers, try to fix it
  if (!normalizedText.includes('\n') && /Date.*Type.*Category.*Description.*Amount/.test(normalizedText)) {
    // Try to detect and insert line breaks between records
    const datePattern = /(20\d{2}-\d{2}-\d{2})/g;
    cleanedText = normalizedText.replace(datePattern, '\n$1');
    
    // If the first character is a newline, remove it (for the header row)
    if (cleanedText.startsWith('\n')) {
      cleanedText = cleanedText.substring(1);
    }
  }
  
  // Split into lines and filter out empty lines and comment lines
  const lines = cleanedText.split('\n')
    .filter(line => line.trim() && !line.trim().startsWith('#'));
  
  if (lines.length === 0) {
    return [];
  }
  
  // Get headers from the first line
  const headerLine = lines[0];
  const headers = headerLine.split(',').map(h => h.trim());
  
  // Process data rows
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const result: Record<string, string> = {};
    
    headers.forEach((header, i) => {
      // Handle the case where values might have fewer items than headers
      result[header] = i < values.length ? values[i]?.trim() || '' : '';
    });
    
    return result;
  });
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
