import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Search as SearchIcon, Check } from 'lucide-react'
import { searchAssets } from '../services/marketData'
import { addPosition, updatePosition } from '../services/firestore'
import { usePortfolio } from '../hooks/usePortfolio'
import useAppStore from '../store/useAppStore'
import './AddPosition.css'

export default function AddPosition() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { getEnrichedPositions, refresh } = usePortfolio()
  const user = useAppStore(s => s.user)
  const showToast = useAppStore(s => s.showToast)

  // Params
  const editId = searchParams.get('edit')
  const preSymbol = searchParams.get('symbol')
  const preName = searchParams.get('name')
  const preType = searchParams.get('type')

  const existingPosition = useMemo(() => {
    if (editId) return getEnrichedPositions().find(p => p.id === editId)
    return null
  }, [editId, getEnrichedPositions])

  // Form State
  const [step, setStep] = useState(editId || preSymbol ? 2 : 1)
  
  // Step 1: Search
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  
  // Step 2: Details
  const [formData, setFormData] = useState({
    symbol: preSymbol || '',
    name: preName || '',
    assetType: preType || 'stock',
    shares: '',
    averageCost: '',
    commission: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load existing data if edit
  useEffect(() => {
    if (existingPosition && !formData.shares) {
      setFormData(prev => ({
        ...prev,
        symbol: existingPosition.symbol,
        name: existingPosition.name,
        assetType: existingPosition.assetType || 'stock',
        shares: existingPosition.shares.toString(),
        averageCost: existingPosition.averageCost.toString(),
        commission: existingPosition.commission?.toString() || '',
        date: existingPosition.date || new Date().toISOString().split('T')[0],
        notes: existingPosition.notes || ''
      }))
    }
  }, [existingPosition])

  // Search
  const searchTimeout = { current: null }
  const handleSearch = useCallback((q) => {
    setQuery(q)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (q.length < 2) { setResults([]); return }

    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await searchAssets(q)
        setResults(data)
      } catch (err) { console.error(err) }
      setSearching(false)
    }, 400)
  }, [])

  const selectAsset = (asset) => {
    setFormData(prev => ({
      ...prev,
      symbol: asset.symbol,
      name: asset.name,
      assetType: asset.assetType
    }))
    setStep(2)
  }

  const handleManualEntry = () => {
    setFormData(prev => ({
      ...prev,
      symbol: query.toUpperCase(),
      name: query.toUpperCase(),
      assetType: 'stock'
    }))
    setStep(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) return

    const positionData = {
      userId: user.uid,
      symbol: formData.symbol.toUpperCase(),
      name: formData.name,
      assetType: formData.assetType,
      shares: parseFloat(formData.shares),
      averageCost: parseFloat(formData.averageCost),
      commission: formData.commission ? parseFloat(formData.commission) : 0,
      date: formData.date,
      notes: formData.notes
    }

    try {
      setIsSubmitting(true)
      if (editId) {
        await updatePosition(user.uid, editId, positionData)
        showToast('Posición actualizada')
      } else {
        await addPosition(user.uid, positionData)
        showToast('Posición agregada con éxito', 'success')
      }
      await refresh()
      navigate('/portfolio')
    } catch (error) {
      console.error(error)
      showToast('Error al guardar la posición', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid = formData.symbol && formData.shares > 0 && formData.averageCost >= 0

  return (
    <div className="page add-position">
      <header className="add-header">
        <button className="add-back-btn" onClick={() => {
          if (step === 2 && !editId && !preSymbol) setStep(1)
          else navigate(-1)
        }}>
          <ArrowLeft size={24} />
        </button>
        <h1 className="add-title">{editId ? 'Editar Posición' : 'Nueva Posición'}</h1>
        <div style={{width: 44}}></div> {/* spacer */}
      </header>

      {step === 1 && (
        <div className="add-search-step">
          <div className="add-search-field">
            <SearchIcon size={18} />
            <input
              type="text"
              placeholder="Ej: AAPL, Mercado Libre..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
            />
          </div>

          {searching ? (
            <div className="add-searching">
              {[1,2,3].map(i => <div key={i} className="shimmer" style={{height: 56, borderRadius: 12}} />)}
            </div>
          ) : results.length > 0 ? (
            <div className="add-results">
              {results.map(r => (
                <button key={r.symbol} className="add-result-item" onClick={() => selectAsset(r)}>
                  <div className="add-result-avatar">
                    <span>{r.symbol.slice(0, 2)}</span>
                  </div>
                  <div className="add-result-info">
                    <div className="add-result-symbol">{r.symbol}</div>
                    <div className="add-result-name">{r.name}</div>
                  </div>
                </button>
              ))}
              <button className="add-manual-btn" onClick={handleManualEntry}>
                Ingresar "{query.toUpperCase()}" manualmente
              </button>
            </div>
          ) : query.length >= 2 ? (
            <div className="add-no-results">
              <p>No encontramos resultados para "{query}"</p>
              <button className="add-manual-btn" onClick={handleManualEntry}>
                Ingresar manualmente
              </button>
            </div>
          ) : null}
        </div>
      )}

      {step === 2 && (
        <form className="add-form" onSubmit={handleSubmit}>
          {/* Asset Preview */}
          <div className="add-asset-preview">
            <div className="preview-avatar">
              <span>{formData.symbol.slice(0,2)}</span>
            </div>
            <div className="preview-info">
              <div className="preview-symbol">{formData.symbol}</div>
              <div className="preview-name">{formData.name}</div>
            </div>
            {!editId && !preSymbol && (
              <button type="button" className="preview-edit-btn" onClick={() => setStep(1)}>
                Cambiar
              </button>
            )}
          </div>

          {/* Type Selection */}
          <div className="add-form-group">
            <label className="add-form-label">Tipo de Activo</label>
            <div className="add-type-chips">
              {['stock', 'crypto', 'etf', 'cedear'].map(type => (
                <button
                  key={type}
                  type="button"
                  className={`add-type-chip ${formData.assetType === type ? 'selected' : ''}`}
                  onClick={() => setFormData(p => ({...p, assetType: type}))}
                >
                  {type.toUpperCase()}
                  {formData.assetType === type && <Check size={14} />}
                </button>
              ))}
            </div>
          </div>

          <div className="add-form-row">
            <div className="add-form-group">
              <label className="add-form-label">Cantidad</label>
              <div className="add-form-field">
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={formData.shares}
                  onChange={e => setFormData(p => ({...p, shares: e.target.value}))}
                  required
                />
              </div>
            </div>
            <div className="add-form-group">
              <label className="add-form-label">Precio Promedio</label>
              <div className="add-form-field">
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={formData.averageCost}
                  onChange={e => setFormData(p => ({...p, averageCost: e.target.value}))}
                  required
                />
              </div>
            </div>
          </div>

          <div className="add-form-row">
            <div className="add-form-group">
              <label className="add-form-label">Comisión (Opcional)</label>
              <div className="add-form-field">
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={formData.commission}
                  onChange={e => setFormData(p => ({...p, commission: e.target.value}))}
                />
              </div>
            </div>
            <div className="add-form-group">
              <label className="add-form-label">Fecha de Compra</label>
              <div className="add-form-field">
                <input
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData(p => ({...p, date: e.target.value}))}
                />
              </div>
            </div>
          </div>

          <div className="add-form-group">
            <label className="add-form-label">Notas (Opcional)</label>
            <div className="add-form-field textarea">
              <textarea
                placeholder="Razón de compra, estrategia..."
                rows={3}
                value={formData.notes}
                onChange={e => setFormData(p => ({...p, notes: e.target.value}))}
              />
            </div>
          </div>

          <button
            type="submit"
            className="add-submit-btn"
            disabled={!isFormValid || isSubmitting}
          >
            {isSubmitting ? 'Guardando...' : editId ? 'Actualizar Posición' : 'Agregar Posición'}
          </button>
        </form>
      )}
    </div>
  )
}
