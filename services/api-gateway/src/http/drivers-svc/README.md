# Drivers Service HTTP Endpoints

This folder contains the HTTP controllers for the Driver microservice in the API Gateway. These controllers expose the driver-ms functionality via REST API.

## Base URL

All endpoints are available at: `http://localhost:8080` (or your configured `GATEWAY_HTTP_PORT`)

---

## Drivers Controller

**Base Path**: `/drivers`

### Create Driver
- **POST** `/drivers`
- **Body**:
  ```json
  {
    "user_id": 123,
    "availability": "AVAILABLE",  // AVAILABLE | ON_ROUTE | LICENSE_EXPIRED | INACTIVE
    "version": 1                  // optional
  }
  ```
- **Response**: Driver object

### Get All Drivers
- **GET** `/drivers`
- **Response**: 
  ```json
  {
    "drivers": [/* array of Driver objects */],
    "total": 10
  }
  ```

### Get Driver by ID
- **GET** `/drivers/:id`
- **Response**: Driver object with licenses and summary

### Update Driver
- **PUT** `/drivers/:id`
- **Body**:
  ```json
  {
    "user_id": 124,              // optional
    "availability": "ON_ROUTE",  // optional
    "version": 2                 // optional
  }
  ```
- **Response**: Updated Driver object

### Delete Driver
- **DELETE** `/drivers/:id`
- **Response**: 
  ```json
  {
    "success": true
  }
  ```

### Check if Driver Can Drive
- **GET** `/drivers/:id/can-drive?licenseTypeId=5`
- **Query Parameters**:
  - `licenseTypeId` (required): The license type ID to check
- **Response**:
  ```json
  {
    "can_drive": true,
    "reason": "Driver has direct license match",
    "matching_licenses": [
      {
        "license_id": 42,
        "license_type": "A1",
        "expires_at": "2026-12-31"
      }
    ]
  }
  ```

---

## License Types Controller

**Base Path**: `/license-types`

### Create License Type
- **POST** `/license-types`
- **Body**:
  ```json
  {
    "code": "A1",
    "description": "Motorcycle license",
    "is_professional": false
  }
  ```
- **Response**: LicenseType object

### Get All License Types
- **GET** `/license-types`
- **Response**: Array of LicenseType objects

### Get License Type by ID
- **GET** `/license-types/:id`
- **Response**: LicenseType object with includes

### Get License Type by Code
- **GET** `/license-types/by-code?code=A1`
- **Query Parameters**:
  - `code` (required): The license type code
- **Response**: LicenseType object

### Update License Type
- **PUT** `/license-types/:id`
- **Body**:
  ```json
  {
    "code": "A1",
    "description": "Updated description",
    "is_professional": true
  }
  ```
- **Response**: Updated LicenseType object

### Delete License Type
- **DELETE** `/license-types/:id`
- **Response**: 
  ```json
  {
    "success": true
  }
  ```

### Add License Inclusion
- **POST** `/license-types/:parentId/includes`
- **Body**:
  ```json
  {
    "childId": 5
  }
  ```
- **Response**: LicenseInclude object
- **Description**: Creates a relationship where the parent license includes/covers the child license

### Remove License Inclusion
- **DELETE** `/license-types/:parentId/includes/:childId`
- **Response**: 
  ```json
  {
    "success": true
  }
  ```

### Get License Closure
- **GET** `/license-types/:id/closure`
- **Response**:
  ```json
  {
    "child_ids": [2, 3, 5, 8]
  }
  ```
- **Description**: Returns all license types that are transitively included by this license type

---

## Driver Licenses Controller

**Base Path**: `/drivers/:driverId/licenses`

### Assign License to Driver
- **POST** `/drivers/:driverId/licenses`
- **Body**:
  ```json
  {
    "license_type_id": 3,
    "number": "ABC123456",
    "issued_at": "2023-01-15",
    "expires_at": "2028-01-15",
    "status": "VALID"           // optional: VALID | EXPIRED | SUSPENDED
  }
  ```
- **Response**: DriverLicense object
- **Business Rules**:
  - License number must be unique
  - Each driver can have only ONE license per license_type_id
  - expires_at must be greater than issued_at

### Get All Licenses for Driver
- **GET** `/drivers/:driverId/licenses`
- **Response**: Array of DriverLicense objects (ordered by expires_at desc)

### Suspend Driver License
- **POST** `/drivers/:driverId/licenses/:licenseId/suspend`
- **Response**: Updated DriverLicense object with status = SUSPENDED

### Get Active Licenses for Driver
- **GET** `/drivers/:driverId/licenses/active`
- **Response**: Array of active DriverLicense objects
- **Filters**: Only returns licenses with status = VALID and expires_at >= today

---

## Example Usage

### Create a Driver
```bash
curl -X POST http://localhost:8080/drivers \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 123,
    "availability": "AVAILABLE"
  }'
```

### Assign a License to Driver
```bash
curl -X POST http://localhost:8080/drivers/1/licenses \
  -H "Content-Type: application/json" \
  -d '{
    "license_type_id": 3,
    "number": "ABC123456",
    "issued_at": "2023-01-15",
    "expires_at": "2028-01-15"
  }'
```

### Check if Driver Can Drive
```bash
curl http://localhost:8080/drivers/1/can-drive?licenseTypeId=5
```

### Create License Type with Inclusion
```bash
# Create parent license (e.g., A - All motorcycles)
curl -X POST http://localhost:8080/license-types \
  -H "Content-Type: application/json" \
  -d '{
    "code": "A",
    "description": "All motorcycles"
  }'

# Create child license (e.g., A1 - Small motorcycles)
curl -X POST http://localhost:8080/license-types \
  -H "Content-Type: application/json" \
  -d '{
    "code": "A1",
    "description": "Small motorcycles"
  }'

# Add inclusion (A includes A1)
curl -X POST http://localhost:8080/license-types/1/includes \
  -H "Content-Type: application/json" \
  -d '{
    "childId": 2
  }'
```

---

## Response Types

### Driver Object
```typescript
{
  driver_id: number;
  user_id: number;
  availability: "AVAILABLE" | "ON_ROUTE" | "LICENSE_EXPIRED" | "INACTIVE";
  version: number;
  created_at: string;  // ISO 8601
  updated_at: string;  // ISO 8601
  licenses?: DriverLicense[];
  summary?: {
    total_licenses: number;
    active_licenses: number;
    expired_licenses: number;
    suspended_licenses: number;
    license_types: string[];
  };
}
```

### DriverLicense Object
```typescript
{
  driver_license_id: number;
  driver_id: number;
  license_type_id: number;
  number: string;
  issued_at: string;        // YYYY-MM-DD
  expires_at: string;       // YYYY-MM-DD
  status: "VALID" | "EXPIRED" | "SUSPENDED";
  version: number;
  license_type_code?: string;
  license_type_description?: string;
  is_active?: boolean;
  days_until_expiry?: number;
}
```

### LicenseType Object
```typescript
{
  license_type_id: number;
  code: string;
  description?: string;
  is_professional: boolean;
  created_at: string;       // ISO 8601
  parent_includes?: LicenseInclude[];
  child_includes?: LicenseInclude[];
  driver_licenses?: DriverLicense[];
}
```

---

## Error Handling

All endpoints return standard HTTP status codes:

- **200 OK**: Successful GET/PUT request
- **201 Created**: Successful POST request
- **204 No Content**: Successful DELETE request
- **400 Bad Request**: Validation error or business rule violation
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server error

Error response format:
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

---

## Notes

- All endpoints use gRPC to communicate with the driver-ms microservice
- Timeout is set to 2-3 seconds per request
- The gateway uses Eureka for service discovery
- Authentication/Authorization is handled by the API Gateway's JWT guard
