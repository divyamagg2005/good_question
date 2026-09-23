import { useNormalizedModel } from './sceneShared';

export function Model({ name, targetSize, tint }: { name: string; targetSize: number; tint?: string }) {
  const model = useNormalizedModel(name, targetSize, tint);
  return <primitive object={model} />;
}
