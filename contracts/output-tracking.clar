;; Output Tracking Contract
;; Monitors completed production against plan

(define-data-var admin principal tx-sender)

;; Production output data structure
(define-map production-outputs
  { output-id: uint }
  {
    order-id: uint,
    quantity-produced: uint,
    quality-score: uint,
    completion-time: uint,
    verified: bool
  }
)

;; Output IDs counter
(define-data-var next-output-id uint u1)

;; Check if caller is admin
(define-private (is-admin)
  (is-eq tx-sender (var-get admin))
)

;; Record production output
(define-public (record-output (order-id uint) (quantity-produced uint) (quality-score uint))
  (begin
    (asserts! (is-admin) (err u403))
    (let ((output-id (var-get next-output-id)))
      (map-set production-outputs
        { output-id: output-id }
        {
          order-id: order-id,
          quantity-produced: quantity-produced,
          quality-score: quality-score,
          completion-time: block-height,
          verified: false
        }
      )
      (var-set next-output-id (+ output-id u1))
      (ok output-id)
    )
  )
)

;; Verify production output
(define-public (verify-output (output-id uint))
  (begin
    (asserts! (is-admin) (err u403))
    (asserts! (is-some (map-get? production-outputs { output-id: output-id })) (err u404))
    (let ((output (unwrap-panic (map-get? production-outputs { output-id: output-id }))))
      (map-set production-outputs
        { output-id: output-id }
        (merge output { verified: true })
      )
      (ok true)
    )
  )
)

;; Update output quality score
(define-public (update-quality-score (output-id uint) (new-quality-score uint))
  (begin
    (asserts! (is-admin) (err u403))
    (asserts! (is-some (map-get? production-outputs { output-id: output-id })) (err u404))
    (let ((output (unwrap-panic (map-get? production-outputs { output-id: output-id }))))
      (map-set production-outputs
        { output-id: output-id }
        (merge output { quality-score: new-quality-score })
      )
      (ok true)
    )
  )
)

;; Get output details
(define-read-only (get-output (output-id uint))
  (map-get? production-outputs { output-id: output-id })
)

;; Transfer admin rights
(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-admin) (err u403))
    (var-set admin new-admin)
    (ok true)
  )
)
