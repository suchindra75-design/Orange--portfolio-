"use client";

import { MeshReflectorMaterial } from "@react-three/drei";
import { stone } from "./materials";
import { useQuality } from "./quality";

/**
 * The ground of a space. On high quality it's a dark, softly reflective honed
 * floor (one extra render pass, only when the frame is drawn — frameloop is
 * on demand). On low quality it's plain honed stone.
 */
export function Floor({
  color,
  size = 160,
  mirror = 0.45,
  blur = 380,
  ...props
}: { color: string; size?: number; mirror?: number; blur?: number } & React.ComponentProps<"group">) {
  const quality = useQuality();
  return (
    <group {...(props as object)}>
      <mesh rotation-x={-Math.PI / 2} material={quality === "low" ? stone(color, { roughness: 0.85, repeat: 30, bump: 0.02 }) : undefined}>
        <planeGeometry args={[size, size]} />
        {quality === "high" && (
          <MeshReflectorMaterial
            color={color}
            roughness={0.85}
            metalness={0.1}
            mirror={mirror}
            blur={[blur, blur * 0.25]}
            resolution={512}
            mixBlur={1}
            mixStrength={1.2}
            depthScale={0.6}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.2}
          />
        )}
      </mesh>
    </group>
  );
}
