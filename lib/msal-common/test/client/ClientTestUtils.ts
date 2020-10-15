import { ClientConfiguration, Constants, LogLevel, NetworkRequestOptions, PkceCodes, ClientAuthError, ProtocolMode} from "../../src";
import { RANDOM_TEST_GUID, TEST_CONFIG, TEST_POP_VALUES } from "../utils/StringConstants";
import { AuthorityFactory } from "../../src";
import { TrustedAuthority } from "../../src/authority/TrustedAuthority";
import sinon from "sinon";
import { CloudDiscoveryMetadata } from "../../src/authority/CloudDiscoveryMetadata";
import { CacheManager } from "../../src/cache/CacheManager";

export class MockStorageClass extends CacheManager {
    store = {};
    setItem(key: string, value: string | object, type?: string): void {
        this.store[key] = value;
    }
    getItem(key: string, type?: string): string | object {
        return this.store[key];
    }
    removeItem(key: string, type?: string): boolean {
        delete this.store[key];
        return true;
    }
    containsKey(key: string, type?: string): boolean {
        return !!this.store[key];
    }
    getKeys(): string[] {
        return Object.keys(this.store);
    }
    clear(): void {
        this.store = {};
    }
}

export class ClientTestUtils {

    static async createTestClientConfiguration(): Promise<ClientConfiguration>{

        const testLoggerCallback = (level: LogLevel, message: string, containsPii: boolean): void => {
            if (containsPii) {
                console.log(`Log level: ${level} Message: ${message}`);
            }
        };

        const mockHttpClient = {
            sendGetRequestAsync<T>(url: string, options?: NetworkRequestOptions): T {
                return null;
            },
            sendPostRequestAsync<T>(url: string, options?: NetworkRequestOptions): T {
                return null;
            }
        };

        const authority  = AuthorityFactory.createInstance(TEST_CONFIG.validAuthority, mockHttpClient, ProtocolMode.AAD);

        await authority.resolveEndpointsAsync().catch(error => {
            throw ClientAuthError.createEndpointDiscoveryIncompleteError(error);
        });

        const store = {};
        return {
            authOptions: {
                clientId: TEST_CONFIG.MSAL_CLIENT_ID,
                authority: authority,
                knownAuthorities: [],
            },
            storageInterface: new MockStorageClass(),
            networkInterface: {
                sendGetRequestAsync<T>(
                    url: string,
                    options?: NetworkRequestOptions
                ): T {
                    return null;
                },
                sendPostRequestAsync<T>(
                    url: string,
                    options?: NetworkRequestOptions
                ): T {
                    return null;
                },
            },
            cryptoInterface: {
                createNewGuid(): string {
                    return RANDOM_TEST_GUID;
                },
                base64Decode(input: string): string {
                    switch (input) {
                        case TEST_POP_VALUES.ENCODED_REQ_CNF:
                            return TEST_POP_VALUES.DECODED_REQ_CNF;
                        default:
                            return input;
                    }
                },
                base64Encode(input: string): string {
                    switch (input) {
                        case TEST_POP_VALUES.DECODED_REQ_CNF:
                            return TEST_POP_VALUES.ENCODED_REQ_CNF;
                        default:
                            return input;
                    }
                },
                async generatePkceCodes(): Promise<PkceCodes> {
                    return {
                        challenge: TEST_CONFIG.TEST_CHALLENGE,
                        verifier: TEST_CONFIG.TEST_VERIFIER,
                    };
                },
                async getPublicKeyThumbprint(): Promise<string> {
                    return TEST_POP_VALUES.KID;
                },
                async signJwt(): Promise<string> {
                    return "";
                }
            },
            loggerOptions: {
                loggerCallback: testLoggerCallback,
            },
            clientCredentials: {
                clientSecret: TEST_CONFIG.MSAL_CLIENT_SECRET,
            },
            libraryInfo: {
                sku: Constants.SKU,
                version: TEST_CONFIG.TEST_VERSION,
                os: TEST_CONFIG.TEST_OS,
                cpu: TEST_CONFIG.TEST_CPU,
            },
        };
    }

    static setCloudDiscoveryMetadataStubs(): void {
        sinon.stub(TrustedAuthority, "IsInTrustedHostList").returns(true);
        const stubbedCloudDiscoveryMetadata: CloudDiscoveryMetadata = {
            preferred_cache: "login.windows.net",
            preferred_network: "login.microsoftonline.com",
            aliases: ["login.microsoftonline.com", "login.windows.net", "login.microsoft.com", "sts.windows.net"]
        };
        sinon.stub(TrustedAuthority, "getTrustedHostList").returns(stubbedCloudDiscoveryMetadata.aliases);
        sinon.stub(TrustedAuthority, "getCloudDiscoveryMetadata").returns(stubbedCloudDiscoveryMetadata);
    }
}
