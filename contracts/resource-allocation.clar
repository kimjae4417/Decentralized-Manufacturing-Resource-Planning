;; Resource Allocation Contract
;; Optimizes equipment and labor assignment

(define-data-var admin principal tx-sender)

;; Resource data structure
(define-map resources
  { resource-id: uint }
  {
    name: (string-utf8 64),
    resource-type: (string-utf8 16),
    capacity: uint,
    available: uint,
    cost-per-hour: uint
  }
)

;; Resource allocation data structure
(define-map allocations
  { allocation-id: uint }
  {
    resource-id: uint,
    order-id: uint,
    start-time: uint,
    end-time: uint,
    allocated-capacity: uint
  }
)

;; Resource IDs counter
(define-data-var next-resource-id uint u1)

;; Allocation IDs counter
(define-data-var next-allocation-id uint u1)

;; Check if caller is admin
(define-private (is-admin)
  (is-eq tx-sender (var-get admin))
)

;; Add new resource
(define-public (add-resource (name (string-utf8 64)) (resource-type (string-utf8 16)) (capacity uint) (cost-per-hour uint))
  (begin
    (asserts! (is-admin) (err u403))
    (let ((resource-id (var-get next-resource-id)))
      (map-set resources
        { resource-id: resource-id }
        {
          name: name,
          resource-type: resource-type,
          capacity: capacity,
          available: capacity,
          cost-per-hour: cost-per-hour
        }
      )
      (var-set next-resource-id (+ resource-id u1))
      (ok resource-id)
    )
  )
)

;; Allocate resource to production order
(define-public (allocate-resource (resource-id uint) (order-id uint) (start-time uint) (end-time uint) (allocated-capacity uint))
  (begin
    (asserts! (is-admin) (err u403))
    (asserts! (is-some (map-get? resources { resource-id: resource-id })) (err u404))

    (let (
      (resource (unwrap-panic (map-get? resources { resource-id: resource-id })))
      (allocation-id (var-get next-allocation-id))
    )
      ;; Check if enough capacity is available
      (asserts! (>= (get available resource) allocated-capacity) (err u401))

      ;; Create allocation
      (map-set allocations
        { allocation-id: allocation-id }
        {
          resource-id: resource-id,
          order-id: order-id,
          start-time: start-time,
          end-time: end-time,
          allocated-capacity: allocated-capacity
        }
      )

      ;; Update available capacity
      (map-set resources
        { resource-id: resource-id }
        (merge resource {
          available: (- (get available resource) allocated-capacity)
        })
      )

      (var-set next-allocation-id (+ allocation-id u1))
      (ok allocation-id)
    )
  )
)

;; Release resource allocation
(define-public (release-allocation (allocation-id uint))
  (begin
    (asserts! (is-admin) (err u403))
    (asserts! (is-some (map-get? allocations { allocation-id: allocation-id })) (err u404))

    (let (
      (allocation (unwrap-panic (map-get? allocations { allocation-id: allocation-id })))
      (resource-id (get resource-id allocation))
      (resource (unwrap-panic (map-get? resources { resource-id: resource-id })))
    )
      ;; Update available capacity
      (map-set resources
        { resource-id: resource-id }
        (merge resource {
          available: (+ (get available resource) (get allocated-capacity allocation))
        })
      )

      (ok true)
    )
  )
)

;; Get resource details
(define-read-only (get-resource (resource-id uint))
  (map-get? resources { resource-id: resource-id })
)

;; Get allocation details
(define-read-only (get-allocation (allocation-id uint))
  (map-get? allocations { allocation-id: allocation-id })
)

;; Transfer admin rights
(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-admin) (err u403))
    (var-set admin new-admin)
    (ok true)
  )
)
