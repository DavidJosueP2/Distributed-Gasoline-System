// src/application/exceptions/index.ts
export { InvalidIdentifierException } from './invalid-id.exception';
export { NotFoundException } from './not-found.exception';
export { DataAlreadyExistsException } from './data-already-exists.exception';
export { RpcExceptionFromValidationErrors } from './RpcExceptionFromValidationErrors';

// Excepciones específicas del dominio de rutas y viajes
export { InvalidTripStatusTransitionException } from './invalid-trip-status-transition.exception';
export { TripNotInCorrectStatusException } from './trip-not-in-correct-status.exception';
export { InvalidVehicleTypeException } from './invalid-vehicle-type.exception';
export { InvalidDistanceException } from './invalid-distance.exception';
export { ReviewCommentRequiredException } from './review-comment-required.exception';
export { VehicleServiceUnavailableException } from './vehicle-service-unavailable.exception';
export { InvalidOdometerReadingException } from './invalid-odometer-reading.exception';
export { RouteHasTripsException } from './route-has-trips.exception';

// Excepciones de validación de viajes
export { DriverBusyException } from './driver-busy.exception';
export { VehicleBusyException } from './vehicle-busy.exception';
export { DriverNotAtLocationException } from './driver-not-at-location.exception';
export { DriverNotAtDestinationException } from './driver-not-at-destination.exception';
export { UnauthorizedSupervisorException } from './unauthorized-supervisor.exception';
export { DriverLicenseMismatchException } from './driver-license-mismatch.exception';
