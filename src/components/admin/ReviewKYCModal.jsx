import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  X,
  FileText,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react'
import { getAuthToken } from '../../utils/getAuthToken'

/**
 * Parses raw KYC document data into a normalized list of documents.
 * Supports:
 *  1. JSON stringified objects or arrays
 *  2. Formatted legacy string: "Doc Type: <type> | File: <url>"
 *  3. Raw URLs (HTTP/HTTPS/Data URLs)
 */
function parseKycDocuments(kycDoc) {
  if (!kycDoc) return []
  const docs = []

  // 1. Try parsing JSON format
  if (typeof kycDoc === 'string' && (kycDoc.trim().startsWith('{') || kycDoc.trim().startsWith('['))) {
    try {
      const parsed = JSON.parse(kycDoc)
      if (Array.isArray(parsed)) {
        parsed.forEach((d, i) => {
          if (typeof d === 'string' && d.trim()) {
            docs.push({ url: d.trim(), name: `Document ${i + 1}`, idType: 'ID Proof' })
          } else if (d && (d.fileUrl || d.url)) {
            docs.push({
              url: d.fileUrl || d.url,
              name: d.fileName || d.name || `Document ${i + 1}`,
              idType: d.idType || 'ID Proof',
            })
          }
        })
      } else if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.documents) && parsed.documents.length > 0) {
          parsed.documents.forEach((d, i) => {
            docs.push({
              url: d.fileUrl || d.url || (typeof d === 'string' ? d : ''),
              name: d.fileName || d.name || `Document ${i + 1}`,
              idType: d.idType || parsed.idType || 'ID Proof',
            })
          })
        } else if (parsed.fileUrl || parsed.url) {
          docs.push({
            url: parsed.fileUrl || parsed.url,
            name: parsed.fileName || parsed.name || 'KYC Document',
            idType: parsed.idType || 'ID Proof',
          })
        }
      }
    } catch {
      // Fall through to regex parse
    }
  }

  // 2. Parse legacy string format: "Doc Type: <type> | File: <url>"
  if (docs.length === 0 && typeof kycDoc === 'string') {
    const fileMatch = kycDoc.match(/File:\s*([^\s|,]+)/i)
    const typeMatch = kycDoc.match(/Doc Type:\s*([^|]+)/i)
    if (fileMatch && fileMatch[1] && fileMatch[1] !== 'N/A' && fileMatch[1] !== 'null') {
      docs.push({
        url: fileMatch[1].trim(),
        name: 'KYC Document',
        idType: typeMatch ? typeMatch[1].trim() : 'ID Proof',
      })
    } else if (kycDoc.startsWith('http://') || kycDoc.startsWith('https://') || kycDoc.startsWith('data:')) {
      docs.push({
        url: kycDoc.trim(),
        name: 'KYC Document',
        idType: 'ID Proof',
      })
    }
  }

  return docs.filter(d => d.url && d.url !== 'N/A' && d.url !== 'null')
}

function isPdfDocument(url, name) {
  if (!url) return false
  const lowerUrl = url.toLowerCase()
  const lowerName = (name || '').toLowerCase()
  return (
    lowerUrl.includes('.pdf') ||
    lowerName.endsWith('.pdf') ||
    lowerUrl.startsWith('data:application/pdf')
  )
}

export const ReviewKYCModal = ({ application, onClose, onApprove, onReject }) => {
  const [adminNotes, setAdminNotes] = useState('')
  const [authToken, setAuthToken] = useState('')
  const [activeDocIndex, setActiveDocIndex] = useState(0)
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [loadingDoc, setLoadingDoc] = useState(true)
  const [docError, setDocError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  const viewerContainerRef = useRef(null)

  // Fetch token on mount for secure document viewing in img/iframe
  useEffect(() => {
    let isMounted = true
    getAuthToken()
      .then(token => {
        if (isMounted && token) setAuthToken(token)
      })
      .catch(() => {})
    return () => {
      isMounted = false
    }
  }, [])

  const documents = useMemo(() => {
    if (!application) return []
    return parseKycDocuments(application.kycDoc)
  }, [application])

  const activeDoc = documents[activeDocIndex] || null
  const isPdf = activeDoc ? isPdfDocument(activeDoc.url, activeDoc.name) : false

  // Construct secure proxied backend document URL
  const secureDocUrl = useMemo(() => {
    if (!application?.id || documents.length === 0) return ''
    const params = new URLSearchParams({
      appId: application.id,
      docIndex: activeDocIndex.toString(),
      r: reloadKey.toString(),
    })
    if (authToken) params.set('token', authToken)
    return `/api/admin/kyc/document?${params.toString()}`
  }, [application?.id, documents.length, activeDocIndex, authToken, reloadKey])

  // Download URL with download=1
  const downloadUrl = useMemo(() => {
    if (!application?.id || documents.length === 0) return '#'
    const params = new URLSearchParams({
      appId: application.id,
      docIndex: activeDocIndex.toString(),
      download: '1',
    })
    if (authToken) params.set('token', authToken)
    return `/api/admin/kyc/document?${params.toString()}`
  }, [application?.id, documents.length, activeDocIndex, authToken])

  // Reset zoom and pan when changing active document
  useEffect(() => {
    setZoom(100)
    setRotation(0)
    setPan({ x: 0, y: 0 })
    setLoadingDoc(true)
    setDocError(null)
  }, [activeDocIndex, reloadKey])

  // Drag-to-pan handlers for zoomed images
  const handleMouseDown = (e) => {
    if (zoom <= 100) return
    setIsDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }

  const handleMouseMove = (e) => {
    if (!isDragging) return
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
  }

  const handleMouseUp = () => setIsDragging(false)

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 300))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50))
  const handleResetZoom = () => {
    setZoom(100)
    setRotation(0)
    setPan({ x: 0, y: 0 })
  }
  const handleRotate = () => setRotation(prev => (prev + 90) % 360)

  if (!application) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full ${
          isFullscreen ? 'max-w-[96vw] h-[95vh]' : 'max-w-4xl max-h-[92vh]'
        } bg-surface border border-outline-variant/30 rounded-2xl shadow-2xl flex flex-col text-on-background overflow-hidden animate-in zoom-in-95 duration-200 transition-all`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-outline-variant/20 bg-surface/80 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-on-background tracking-tight">
                Review KYC: {application.orgName || application.applicantName}
              </h2>
              <p className="text-[11px] text-on-surface-variant">
                ID Verification & Accreditation Review • Application ID: {application.id || 'N/A'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullscreen(prev => !prev)}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-surface-variant/40 hover:bg-surface-variant text-on-surface-variant hover:text-on-background transition-colors"
              title={isFullscreen ? 'Restore view' : 'Maximize viewer'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-surface-variant/40 hover:bg-surface-variant text-on-surface-variant hover:text-on-background transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex flex-col gap-5 custom-scrollbar flex-1 min-h-0">
          {/* Primary details */}
          <div className="p-4 bg-surface-container/50 rounded-xl border border-outline-variant/20 grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-xs">
            <div>
              <span className="font-bold text-on-surface-variant uppercase tracking-wider text-[10px] block">Applicant</span>
              <span className="font-semibold text-on-background">{application.applicantName || '—'}</span>
            </div>
            <div>
              <span className="font-bold text-on-surface-variant uppercase tracking-wider text-[10px] block">Email</span>
              <span className="font-semibold text-on-background break-all">{application.email || '—'}</span>
            </div>
            <div>
              <span className="font-bold text-on-surface-variant uppercase tracking-wider text-[10px] block">Phone</span>
              <span className="font-semibold text-on-background">{application.phone || '—'}</span>
            </div>
            <div>
              <span className="font-bold text-on-surface-variant uppercase tracking-wider text-[10px] block">Plan</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 mt-0.5">
                {application.selectedPlan || 'Free'}
              </span>
            </div>
            <div>
              <span className="font-bold text-on-surface-variant uppercase tracking-wider text-[10px] block">City / Region</span>
              <span className="text-on-background">{application.cityRegion || 'N/A'}</span>
            </div>
            <div>
              <span className="font-bold text-on-surface-variant uppercase tracking-wider text-[10px] block">Portfolio</span>
              <span className="text-on-background truncate block">{application.portfolio || 'N/A'}</span>
            </div>
          </div>

          {/* KYC Document Viewer Section */}
          <div className="bg-surface-container/40 rounded-xl border border-outline-variant/25 overflow-hidden flex flex-col">
            {/* Viewer Header / Toolbar */}
            <div className="p-3 sm:px-4 sm:py-3 bg-surface-container-high/60 border-b border-outline-variant/20 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-on-surface-variant uppercase tracking-wider text-[10px]">
                  Uploaded KYC Credentials
                </span>
                {activeDoc && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                    <FileText className="w-3 h-3" />
                    {activeDoc.idType || 'ID Proof'}
                  </span>
                )}
                {documents.length > 1 && (
                  <span className="text-[11px] font-medium text-on-surface-variant">
                    ({activeDocIndex + 1} of {documents.length})
                  </span>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Multi-document Navigation */}
                {documents.length > 1 && (
                  <div className="flex items-center gap-1 mr-2 bg-surface rounded-lg p-0.5 border border-outline-variant/30">
                    <button
                      onClick={() => setActiveDocIndex(prev => Math.max(prev - 1, 0))}
                      disabled={activeDocIndex === 0}
                      className="p-1 rounded text-on-surface-variant hover:text-on-background hover:bg-surface-variant/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Previous document"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-semibold px-1 text-on-background">
                      {activeDocIndex + 1}/{documents.length}
                    </span>
                    <button
                      onClick={() => setActiveDocIndex(prev => Math.min(prev + 1, documents.length - 1))}
                      disabled={activeDocIndex === documents.length - 1}
                      className="p-1 rounded text-on-surface-variant hover:text-on-background hover:bg-surface-variant/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Next document"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Zoom & Rotate (Only for Images) */}
                {!isPdf && documents.length > 0 && (
                  <div className="flex items-center gap-1 bg-surface rounded-lg p-0.5 border border-outline-variant/30">
                    <button
                      onClick={handleZoomOut}
                      className="p-1 rounded text-on-surface-variant hover:text-on-background hover:bg-surface-variant/40 transition-colors"
                      title="Zoom Out (-25%)"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleResetZoom}
                      className="px-1.5 py-0.5 text-[10px] font-mono text-on-surface-variant hover:text-on-background transition-colors"
                      title="Reset Zoom"
                    >
                      {zoom}%
                    </button>
                    <button
                      onClick={handleZoomIn}
                      className="p-1 rounded text-on-surface-variant hover:text-on-background hover:bg-surface-variant/40 transition-colors"
                      title="Zoom In (+25%)"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-[1px] h-3.5 bg-outline-variant/30 mx-0.5" />
                    <button
                      onClick={handleRotate}
                      className="p-1 rounded text-on-surface-variant hover:text-on-background hover:bg-surface-variant/40 transition-colors"
                      title="Rotate 90°"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Refresh */}
                {documents.length > 0 && (
                  <button
                    onClick={() => setReloadKey(prev => prev + 1)}
                    className="p-1.5 rounded-lg bg-surface border border-outline-variant/30 text-on-surface-variant hover:text-on-background hover:bg-surface-variant/40 transition-colors"
                    title="Reload document"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Download Button */}
                {documents.length > 0 && (
                  <a
                    href={downloadUrl}
                    download
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-primary text-on-primary hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                )}
              </div>
            </div>

            {/* Viewer Canvas Area */}
            <div
              ref={viewerContainerRef}
              className={`relative w-full ${
                isFullscreen ? 'h-[55vh]' : 'h-72 sm:h-96'
              } bg-black/40 overflow-hidden flex items-center justify-center select-none`}
            >
              {documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6 text-center text-on-surface-variant">
                  <AlertCircle className="w-8 h-8 text-amber-400 mb-2" />
                  <p className="text-xs font-semibold text-on-background">No KYC document uploaded</p>
                  <p className="text-[11px] text-on-surface-variant/70 mt-0.5">
                    The applicant did not attach an identity proof document with this application.
                  </p>
                </div>
              ) : (
                <>
                  {/* Loading Spinner */}
                  {loadingDoc && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-surface/50 backdrop-blur-sm gap-2">
                      <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-[11px] font-medium text-on-surface-variant">Loading document preview...</span>
                    </div>
                  )}

                  {/* Error State */}
                  {docError ? (
                    <div className="flex flex-col items-center justify-center p-6 text-center max-w-sm">
                      <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
                      <p className="text-xs font-semibold text-rose-400">Failed to display document</p>
                      <p className="text-[11px] text-on-surface-variant mt-1">{docError}</p>
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => setReloadKey(prev => prev + 1)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface border border-outline-variant/30 text-on-background hover:bg-surface-variant transition-colors inline-flex items-center gap-1.5"
                        >
                          <RefreshCw className="w-3 h-3" /> Retry
                        </button>
                        <a
                          href={downloadUrl}
                          download
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-on-primary hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5"
                        >
                          <Download className="w-3 h-3" /> Direct Download
                        </a>
                      </div>
                    </div>
                  ) : isPdf ? (
                    /* PDF Document Preview */
                    <div className="w-full h-full flex flex-col">
                      <iframe
                        src={secureDocUrl}
                        title="KYC PDF Document"
                        className="w-full h-full border-0 bg-white"
                        onLoad={() => setLoadingDoc(false)}
                        onError={() => {
                          setLoadingDoc(false)
                          setDocError('Unable to render PDF preview. Please download the document directly.')
                        }}
                      />
                    </div>
                  ) : (
                    /* Image Document Viewer with Pan & Zoom */
                    <div
                      className={`w-full h-full flex items-center justify-center overflow-hidden ${
                        zoom > 100 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
                      }`}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                    >
                      <img
                        src={secureDocUrl}
                        alt="KYC Document Preview"
                        draggable={false}
                        onLoad={() => {
                          setLoadingDoc(false)
                          setDocError(null)
                        }}
                        onError={() => {
                          setLoadingDoc(false)
                          setDocError('Could not load the image document. It may have expired or is in an unsupported format.')
                        }}
                        style={{
                          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100}) rotate(${rotation}deg)`,
                          transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                          maxWidth: '90%',
                          maxHeight: '90%',
                          objectFit: 'contain',
                        }}
                        className="rounded shadow-md select-none"
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Multi-document thumbnail / selector list */}
            {documents.length > 1 && (
              <div className="p-2.5 bg-surface-container-high/40 border-t border-outline-variant/20 flex items-center gap-2 overflow-x-auto">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider shrink-0 mr-1">
                  Documents:
                </span>
                {documents.map((doc, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveDocIndex(idx)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shrink-0 ${
                      activeDocIndex === idx
                        ? 'bg-primary text-on-primary font-bold shadow-sm'
                        : 'bg-surface hover:bg-surface-variant text-on-surface-variant border border-outline-variant/30'
                    }`}
                  >
                    <FileText className="w-3 h-3" />
                    <span>{doc.name || `Document ${idx + 1}`}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Secondary Details */}
          <div className="p-4 bg-surface-container/50 rounded-xl border border-outline-variant/20 grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div className="sm:col-span-2">
              <span className="font-bold text-on-surface-variant uppercase tracking-wider text-[10px] block">Experience</span>
              <p className="text-on-background mt-0.5 leading-relaxed">{application.experience || 'N/A'}</p>
            </div>
            {application.games && (
              <div className="sm:col-span-2">
                <span className="font-bold text-on-surface-variant uppercase tracking-wider text-[10px] block">Games</span>
                <span className="text-on-background">
                  {(typeof application.games === 'string' ? JSON.parse(application.games) : application.games)?.join(', ') || 'N/A'}
                </span>
              </div>
            )}
            <div>
              <span className="font-bold text-on-surface-variant uppercase tracking-wider text-[10px] block">Discord</span>
              <span className="text-on-background">{application.discordLink || 'N/A'}</span>
            </div>
            <div>
              <span className="font-bold text-on-surface-variant uppercase tracking-wider text-[10px] block">Additional Notes</span>
              <span className="text-on-background">{application.additionalNotes || 'N/A'}</span>
            </div>
          </div>

          {/* Admin Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
              Accreditation Feedback / Admin Notes
            </label>
            <textarea
              rows={3}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="w-full p-3 bg-surface border border-outline-variant/30 rounded-xl text-xs text-on-background placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
              placeholder="Provide reasoning for approval/rejection or organizer guidelines..."
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-outline-variant/20 flex items-center justify-end gap-3 bg-surface/80 backdrop-blur-sm shrink-0">
          <button
            onClick={() => onReject(adminNotes)}
            className="px-4 py-2.5 min-h-[42px] text-xs font-bold text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
          >
            Reject Application
          </button>
          <button
            onClick={() => onApprove(adminNotes)}
            className="px-5 py-2.5 min-h-[42px] text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
          >
            Approve & Activate
          </button>
        </div>
      </div>
    </div>
  )
}
