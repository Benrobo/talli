import { HttpException } from "../../lib/exception.js";

/**
 * Raised when a Nomba call fails — either the HTTP layer rejected the request
 * or the response envelope carried a non-`"00"` code. Extends `HttpException`
 * so `useCatchErrors` maps it to a JSON response without special handling.
 *
 * `nombaCode` is Nomba's business code (`"00"` success, `"02"` validation, …)
 * and is `null` for transport-level failures (timeouts, network errors).
 */
export class NombaError extends HttpException {
  public readonly nombaCode: string | null;
  public readonly description: string;

  constructor(params: {
    message: string;
    httpStatus: number;
    nombaCode: string | null;
    description: string;
  }) {
    super(params.message, params.httpStatus);
    this.name = "NombaError";
    this.nombaCode = params.nombaCode;
    this.description = params.description;
  }
}
