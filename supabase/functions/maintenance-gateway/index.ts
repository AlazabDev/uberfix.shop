/**
 * Legacy path shim — maintenance-gateway.
 * النظام أصبح بابين: REST على /functions/v1/api وMCP على /functions/v1/mcp.
 */
import { serveLegacyShim } from '../_shared/legacy-shim.ts';

serveLegacyShim('maintenance-gateway');
