/**
 * Legacy path shim — gateway.
 * النظام أصبح بابين: REST على /functions/v1/api وMCP على /functions/v1/mcp.
 */
import { serveLegacyShim } from '../_shared/legacy-shim.ts';

serveLegacyShim('gateway');
