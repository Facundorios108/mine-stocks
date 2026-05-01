import { BarChart3 } from 'lucide-react'
import './Placeholder.css'

export default function Analytics() {
  return (
    <div className="page placeholder-page">
      <div className="placeholder-content">
        <div className="placeholder-icon">
          <BarChart3 size={48} strokeWidth={1} />
        </div>
        <h2>Analytics</h2>
        <p>Próximamente: distribución por sector, rendimiento temporal, métricas avanzadas.</p>
      </div>
    </div>
  )
}
