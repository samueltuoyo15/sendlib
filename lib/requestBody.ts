/** Bound the stream itself; Content-Length alone can be omitted or forged. */
export async function readJsonBody(request: Request, maxBytes: number): Promise<unknown> {
  const tooLarge = () =>
    new Response(JSON.stringify({ success: false, message: "Request body too large." }), {
      status: 413,
      headers: { "Content-Type": "application/json" },
    });
  if (Number(request.headers.get("content-length")) > maxBytes) throw tooLarge();
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError("Missing JSON body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw tooLarge();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}
