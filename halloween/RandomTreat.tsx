import type { ComponentType } from "react"
import { useEffect, useState } from "react"

// Hides the treat behind a random pumpkin on every page load.
const LAYOUTS = ["Idle", "Idle B", "Idle C"]

export function withRandomTreat(Component): ComponentType {
    return (props: any) => {
        const [variant, setVariant] = useState(props.variant ?? "Idle")
        useEffect(() => {
            setVariant(LAYOUTS[Math.floor(Math.random() * LAYOUTS.length)])
        }, [])
        return <Component {...props} variant={variant} />
    }
}
