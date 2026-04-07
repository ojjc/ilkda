import { useState, useCallback } from 'react'
import styles from './StarRating.module.css'

/**
 * 5-star rating system with half star rating implementation
 *
 * internally i decided to store ratings as 0-10
 * this component converts:
 *   database value -> display: divide by 2
 *   client side value -> multiply by 2
 *
 * half-star detection: track the mouse X position within each star button
 * left half of the button = 0.5, right half = 1.0.
 *
 * @param {{ value: number, onChange: (dbValue: number) => void }} props
 *   value - database score (0–10 integer)
 *   onChange - called with a databasescore (0–10 integer)
 */
export function StarRating({ value, onChange }) {
  // hoveredVal is a display value (0–5, increments of 0.5). 0 = not hovering.
  const [hoveredVal, setHoveredVal] = useState(0)

  // convert score for db storage -> display value for rendering
  const savedDisplay = value / 2 
  const activeDisplay = hoveredVal || savedDisplay


   // determine whether a star position (1–5) based on fill value (0.5 or 1.0) should be lit based on the current active display value.
   // e.g. star 3 at fill 0.5 is lit when activeDisplay >= 2.5, star 3 at fill 1.0 is lit when activeDisplay >= 3.0
  const isLit = (starIndex, fill) => activeDisplay >= (starIndex - 1) + fill


  // detect half vs full star from mouse X position within the button element.
  const getHalfFromEvent = useCallback((e, starIndex) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const half = x < rect.width / 2 ? 0.5 : 1.0
    return (starIndex - 1) + half  // display value (e.g. star 3 left half → 2.5)
  }, [])

  const handleMouseMove = useCallback((e, starIndex) => {
    setHoveredVal(getHalfFromEvent(e, starIndex))
  }, [getHalfFromEvent])

  const handleClick = useCallback((e, starIndex) => {
    const displayVal = getHalfFromEvent(e, starIndex)
    onChange(Math.round(displayVal * 2))  // convert to database score (×2)
  }, [getHalfFromEvent, onChange])

  // label: show hovered value while hovering, else saved value
  const labelDisplay = hoveredVal || savedDisplay
  const labelText = labelDisplay ? labelDisplay.toFixed(labelDisplay % 1 === 0 ? 0 : 1) : '—'

  return (
    <div className={styles.wrap}>
      <div className={styles.stars} onMouseLeave={() => setHoveredVal(0)}>
        {[1, 2, 3, 4, 5].map((starIndex) => {
          const halfLit = isLit(starIndex, 0.5)
          const fullLit = isLit(starIndex, 1.0)

          return (
            <button
              key={starIndex}
              type="button"
              className={styles.star}
              onMouseMove={(e) => handleMouseMove(e, starIndex)}
              onClick={(e) => handleClick(e, starIndex)}
              aria-label={`${starIndex} stars`}
            >
              {/* base star: always dimmed */}
              <span className={styles.starBase}>★</span>

              {/* overlay: half-fill or full-fill clipped on top */}
              {halfLit && (
                <span
                  className={styles.starFill}
                  style={{ clipPath: fullLit ? 'none' : 'inset(0 50% 0 0)' }}
                >
                  ★
                </span>
              )}
            </button>
          )
        })}
      </div>

      <span className={styles.label}>{labelText}</span>
    </div>
  )
}
