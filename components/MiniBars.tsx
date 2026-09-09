export function MiniBars({ values = [42, 58, 47, 72, 66, 84, 76, 91, 80, 96, 88, 100] }: { values?: number[] }) {
  return <div className="bars" aria-label="Gráfica de actividad">{values.map((value, index) => <span className="bar" style={{ height: `${value}%` }} key={`${value}-${index}`} />)}</div>;
}
