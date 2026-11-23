// Stand-in for Framer's editor API: property controls only matter inside Framer, so they do nothing here.
export const ControlType = new Proxy({} as Record<string, string>, { get: (_, k) => String(k) })
export function addPropertyControls(..._args: unknown[]) {}
