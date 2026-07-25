export function LoadingOverlay({ step }: { step: string }): JSX.Element {
  return (
    <div className="overlay">
      <div className="box">
        <div className="spinner lg" />
        <div className="step">{step}</div>
      </div>
    </div>
  )
}
