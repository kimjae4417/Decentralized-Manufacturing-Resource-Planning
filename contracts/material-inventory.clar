;; Material Inventory Contract
;; Tracks available production components

(define-data-var admin principal tx-sender)

;; Material data structure
(define-map materials
  { material-id: uint }
  {
    name: (string-utf8 64),
    quantity: uint,
    unit-cost: uint,
    last-updated: uint
  }
)

;; Material IDs counter
(define-data-var next-material-id uint u1)

;; Check if caller is admin
(define-private (is-admin)
  (is-eq tx-sender (var-get admin))
)

;; Add new material to inventory
(define-public (add-material (name (string-utf8 64)) (quantity uint) (unit-cost uint))
  (begin
    (asserts! (is-admin) (err u403))
    (let ((material-id (var-get next-material-id)))
      (map-set materials
        { material-id: material-id }
        {
          name: name,
          quantity: quantity,
          unit-cost: unit-cost,
          last-updated: block-height
        }
      )
      (var-set next-material-id (+ material-id u1))
      (ok material-id)
    )
  )
)

;; Update material quantity
(define-public (update-quantity (material-id uint) (new-quantity uint))
  (begin
    (asserts! (is-admin) (err u403))
    (asserts! (is-some (map-get? materials { material-id: material-id })) (err u404))
    (let ((material (unwrap-panic (map-get? materials { material-id: material-id }))))
      (map-set materials
        { material-id: material-id }
        (merge material {
          quantity: new-quantity,
          last-updated: block-height
        })
      )
      (ok true)
    )
  )
)

;; Consume materials for production
(define-public (consume-material (material-id uint) (amount uint))
  (begin
    (asserts! (is-admin) (err u403))
    (let ((material (unwrap-panic (map-get? materials { material-id: material-id }))))
      (asserts! (>= (get quantity material) amount) (err u401))
      (map-set materials
        { material-id: material-id }
        (merge material {
          quantity: (- (get quantity material) amount),
          last-updated: block-height
        })
      )
      (ok true)
    )
  )
)

;; Get material details
(define-read-only (get-material (material-id uint))
  (map-get? materials { material-id: material-id })
)

;; Transfer admin rights
(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-admin) (err u403))
    (var-set admin new-admin)
    (ok true)
  )
)
