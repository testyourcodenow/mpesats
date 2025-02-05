import axios, { AxiosInstance } from "axios";
import { MpesaConfig } from "./types"
import * as constants from "constants";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

export class Service {

    private http: AxiosInstance

    /**
     * @var object config Configuration options
     */
    public config: MpesaConfig = {
        env: "sandbox",
        type: 4,
        shortcode: 174379,
        store: 174379,
        key: "9v38Dtu5u2BpsITPmLcXNWGMsjZRWSTG",
        secret: "bclwIPkcRqw61yUt",
        username: "apitest",
        password: "",
        passkey: "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919",
        validationUrl: "/lipwa/validate",
        confirmationUrl: "/lipwa/confirm",
        callbackUrl: "/lipwa/reconcile",
        timeoutUrl: "/lipwa/timeout",
        resultUrl: "/lipwa/results",
    };
    /**
     * Setup global configuration for classes
     * @var Array configs Formatted configuration options
     *
     * @return void
     */
    constructor(configs: MpesaConfig) {
        this.config = configs;

        this.http = axios.create({
            baseURL: this.config.env == "live"
                ? "https://api.safaricom.co.ke"
                : "https://sandbox.safaricom.co.ke",
            withCredentials: true,
        });

        this.http.defaults.headers.common = {
            Accept: "application/json",
            "Content-Type": "application/json"
        };
    }

    /**
     * Fetch Token To Authenticate Requests
     *
     * @return string Access token
     */

    private async authenticate() {
        try {
            const { data } = await this.get("oauth/v1/generate?grant_type=client_credentials")

            return data?.access_token;
        } catch (error) {
            return error
        }
    }

    public async generateSecurityCredential() {
        return crypto
            .publicEncrypt(
                {
                    key: fs.readFileSync(
                        path.join(
                            __dirname,
                            "certs",
                            this.config.env,
                            "cert.cer"
                        ),
                        "utf8"
                    ),
                    padding: constants.RSA_PKCS1_PADDING
                },

                Buffer.from(this.config.password)
            )
            .toString("base64");

    }

    /**
     * Perform a GET request to the M-PESA Daraja API
     * @var String endpoint Daraja API URL Endpoint
     * @var String credentials Formated Auth credentials
     *
     * @return string/bool
     */
    public async get(endpoint: string) {
        const auth = "Basic " + Buffer.from(
            this.config.key + ":" + this.config.secret
        ).toString("base64")

        return await this.http.get(
            endpoint,
            {
                headers: {
                    "Authorization": auth
                }
            },
        )
    }

    /**
     * Perform a POST request to the M-PESA Daraja API
     * @var String endpoint Daraja API URL Endpoint
     * @var Array data Formated array of data to send
     *
     * @return string/bool
     */
    public async post(endpoint: string, payload: any) {
        return this.http.post(
            endpoint,
            payload,
            {
                headers: {
                    "Authorization": "Bearer " + await this.authenticate()
                }
            },
        )
            .then(({ data }) => data)
            .catch((e: any) => {
                if (e.response.data) {
                    return e.response.data
                } else {
                    return { errorCode: 500, errorMessage: e.message }
                }
            })
    }
}