const axios = require('axios');

class WeatherService {
    constructor() {
        this.baseUrl = 'https://api.weather.gov';
        this.userAgent = 'StormAlertSystem/1.0 (contact@stormalertsystem.com)';
        
        // Comprehensive mapping of states to their NWS offices and zone ranges
        this.stateOfficeMapping = {
            'Alabama': {
                'BMX': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
                'HUN': { zones: [31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50] },
                'MOB': { zones: [51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68] }
            },
            'Alaska': {
                'AFC': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
                'AJK': { zones: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
                'AFG': { zones: [31, 32, 33, 34, 35, 36, 37, 38, 39, 40] }
            },
            'Arizona': {
                'FGZ': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
                'PSR': { zones: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40] },
                'TWC': { zones: [41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60] }
            },
            'Arkansas': {
                'LZK': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25] },
                'TSA': { zones: [26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40] },
                'MEG': { zones: [41, 42, 43, 44, 45, 46, 47, 48, 49, 50] },
                'SHV': { zones: [51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65] }
            },
            'California': {
                'LOX': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
                'SGX': { zones: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40] },
                'STO': { zones: [41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60] },
                'EKA': { zones: [61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75] },
                'MTR': { zones: [76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90] },
                'HNX': { zones: [91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105] }
            },
            'Colorado': {
                'BOU': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25] },
                'PUB': { zones: [26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45] },
                'GJT': { zones: [46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60] },
                'CYS': { zones: [61, 62, 63, 64, 65, 66, 67, 68, 69, 70] }
            },
            'Connecticut': {
                'BOX': { zones: [1, 2, 3, 4, 5, 6, 7, 8] },
                'OKX': { zones: [9, 10, 11, 12, 13, 14, 15, 16] }
            },
            'Delaware': {
                'PHI': { zones: [1, 2, 3] },
                'AKQ': { zones: [4, 5, 6] }
            },
            'Florida': {
                'JAX': { zones: [211, 212, 213, 214, 215, 221, 222, 223, 224, 225] },
                'MLB': { zones: [231, 232, 233, 234, 235, 241, 242, 243, 244, 245] },
                'MFL': { zones: [251, 252, 253, 254, 255, 261, 262, 263, 264, 265] },
                'KEY': { zones: [271, 272, 273, 274, 275, 276] },
                'TBW': { zones: [281, 282, 283, 284, 285, 286] },
                'TAE': { zones: [291, 292, 293, 294, 295, 296] }
            },
            'Georgia': {
                'FFC': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25] },
                'JAX': { zones: [26, 27, 28, 29, 30, 31, 32, 33, 34, 35] },
                'CHS': { zones: [36, 37, 38, 39, 40, 41, 42, 43, 44, 45] },
                'TAE': { zones: [46, 47, 48, 49, 50, 51, 52, 53, 54, 55] }
            },
            'Hawaii': {
                'HFO': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] }
            },
            'Idaho': {
                'BOI': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
                'PIH': { zones: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
                'MSO': { zones: [31, 32, 33, 34, 35, 36, 37, 38, 39, 40] }
            },
            'Illinois': {
                'LOT': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
                'ILX': { zones: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40] },
                'PAH': { zones: [41, 42, 43, 44, 45, 46, 47, 48, 49, 50] },
                'DVN': { zones: [51, 52, 53, 54, 55, 56, 57, 58, 59, 60] }
            },
            'Indiana': {
                'IWX': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
                'IND': { zones: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40] },
                'PAH': { zones: [41, 42, 43, 44, 45, 46, 47, 48, 49, 50] },
                'ILN': { zones: [51, 52, 53, 54, 55, 56, 57, 58, 59, 60] }
            },
            'Iowa': {
                'DMX': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25] },
                'DVN': { zones: [26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40] },
                'ARX': { zones: [41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55] }
            },
            'Kansas': {
                'TOP': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25] },
                'ICT': { zones: [26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45] },
                'DDC': { zones: [46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60] },
                'GLD': { zones: [61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75] }
            },
            'Kentucky': {
                'LMK': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
                'PAH': { zones: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
                'JKL': { zones: [31, 32, 33, 34, 35, 36, 37, 38, 39, 40] },
                'ILN': { zones: [41, 42, 43, 44, 45, 46, 47, 48, 49, 50] }
            },
            'Louisiana': {
                'LIX': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
                'LCH': { zones: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35] },
                'SHV': { zones: [36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50] }
            },
            'Maine': {
                'GYX': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
                'CAR': { zones: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30] }
            },
            'Maryland': {
                'LWX': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
                'PHI': { zones: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
                'AKQ': { zones: [31, 32, 33, 34, 35, 36, 37, 38, 39, 40] }
            },
            'Massachusetts': {
                'BOX': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] }
            },
            'Michigan': {
                'GRR': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
                'DTX': { zones: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35] },
                'APX': { zones: [36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50] },
                'MQT': { zones: [51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65] }
            },
            'Minnesota': {
                'MPX': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
                'DLH': { zones: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35] },
                'FGF': { zones: [36, 37, 38, 39, 40, 41, 42, 43, 44, 45] }
            },
            'Mississippi': {
                'JAN': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
                'MEG': { zones: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
                'MOB': { zones: [31, 32, 33, 34, 35, 36, 37, 38, 39, 40] },
                'LIX': { zones: [41, 42, 43, 44, 45, 46, 47, 48, 49, 50] }
            },
            'Missouri': {
                'SGF': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
                'LSX': { zones: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35] },
                'EAX': { zones: [36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50] },
                'PAH': { zones: [51, 52, 53, 54, 55, 56, 57, 58, 59, 60] }
            },
            'Montana': {
                'TFX': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
                'MSO': { zones: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
                'GGW': { zones: [31, 32, 33, 34, 35, 36, 37, 38, 39, 40] },
                'BYZ': { zones: [41, 42, 43, 44, 45, 46, 47, 48, 49, 50] }
            },
            'Nebraska': {
                'OAX': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
                'GID': { zones: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35] },
                'LBF': { zones: [36, 37, 38, 39, 40, 41, 42, 43, 44, 45] },
                'CYS': { zones: [46, 47, 48, 49, 50] }
            },
            'Nevada': {
                'REV': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
                'VEF': { zones: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
                'ELY': { zones: [31, 32, 33, 34, 35, 36, 37, 38, 39, 40] }
            },
            'New Hampshire': {
                'GYX': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
                'BOX': { zones: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20] }
            },
            'New Jersey': {
                'PHI': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
                'OKX': { zones: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30] }
            },
            'New Mexico': {
                'ABQ': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
                'EPZ': { zones: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
                'LUB': { zones: [31, 32, 33, 34, 35, 36, 37, 38, 39, 40] }
            },
            'New York': {
                'ALY': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
                'BGM': { zones: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
                'BUF': { zones: [31, 32, 33, 34, 35, 36, 37, 38, 39, 40] },
                'OKX': { zones: [41, 42, 43, 44, 45, 46, 47, 48, 49, 50] }
            },
            'North Carolina': {
                'RAH': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
                'ILM': { zones: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
                'MHX': { zones: [31, 32, 33, 34, 35, 36, 37, 38, 39, 40] },
                'GSP': { zones: [41, 42, 43, 44, 45, 46, 47, 48, 49, 50] }
            },
            'North Dakota': {
                'BIS': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
                'FGF': { zones: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30] }
            },
            'Ohio': {
                'CLE': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
                'ILN': { zones: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35] },
                'PBZ': { zones: [36, 37, 38, 39, 40, 41, 42, 43, 44, 45] },
                'IWX': { zones: [46, 47, 48, 49, 50, 51, 52, 53, 54, 55] }
            },
            'Oklahoma': {
                'OUN': { zones: [211, 212, 213, 214, 215, 221, 222, 223, 224, 225] },
                'TSA': { zones: [231, 232, 233, 234, 235, 241, 242, 243, 244, 245] },
                'DDC': { zones: [251, 252, 253, 254, 255] }
            },
            'Oregon': {
                'PQR': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
                'MFR': { zones: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
                'PDT': { zones: [31, 32, 33, 34, 35, 36, 37, 38, 39, 40] },
                'BOI': { zones: [41, 42, 43, 44, 45, 46, 47, 48, 49, 50] }
            },
            'Pennsylvania': {
                'PHI': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
                'PBZ': { zones: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35] },
                'CTP': { zones: [36, 37, 38, 39, 40, 41, 42, 43, 44, 45] },
                'BGM': { zones: [46, 47, 48, 49, 50, 51, 52, 53, 54, 55] }
            },
            'Rhode Island': {
                'BOX': { zones: [1, 2, 3, 4, 5] }
            },
            'South Carolina': {
                'CHS': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
                'CAE': { zones: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
                'GSP': { zones: [31, 32, 33, 34, 35, 36, 37, 38, 39, 40] }
            },
            'South Dakota': {
                'FSD': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
                'ABR': { zones: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
                'UNR': { zones: [31, 32, 33, 34, 35, 36, 37, 38, 39, 40] }
            },
            'Tennessee': {
                'MEG': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
                'MRX': { zones: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
                'OHX': { zones: [31, 32, 33, 34, 35, 36, 37, 38, 39, 40] },
                'HUN': { zones: [41, 42, 43, 44, 45, 46, 47, 48, 49, 50] }
            },
            'Texas': {
                'LUB': { zones: [211, 212, 213, 214, 215, 216, 221, 222, 223, 224, 225, 226, 231, 232, 233, 234, 235, 236, 241, 242, 243, 244, 245, 246, 251, 252, 253, 254, 255, 256] },
                'FWD': { zones: [261, 262, 263, 264, 265, 266, 271, 272, 273, 274, 275, 276] },
                'HGX': { zones: [281, 282, 283, 284, 285, 286] },
                'CRP': { zones: [291, 292, 293, 294, 295, 296] }
            },
            'Utah': {
                'SLC': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
                'GJT': { zones: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30] }
            },
            'Vermont': {
                'BTV': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
                'ALY': { zones: [11, 12, 13, 14, 15] }
            },
            'Virginia': {
                'LWX': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
                'AKQ': { zones: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
                'RNK': { zones: [31, 32, 33, 34, 35, 36, 37, 38, 39, 40] }
            },
            'Washington': {
                'SEW': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
                'OTX': { zones: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
                'PQR': { zones: [31, 32, 33, 34, 35, 36, 37, 38, 39, 40] }
            },
            'West Virginia': {
                'LWX': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
                'PBZ': { zones: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
                'CTP': { zones: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
                'RLX': { zones: [31, 32, 33, 34, 35, 36, 37, 38, 39, 40] }
            },
            'Wisconsin': {
                'MKX': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
                'GRB': { zones: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
                'DLH': { zones: [31, 32, 33, 34, 35, 36, 37, 38, 39, 40] },
                'MPX': { zones: [41, 42, 43, 44, 45, 46, 47, 48, 49, 50] }
            },
            'Wyoming': {
                'CYS': { zones: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
                'RIW': { zones: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
                'BYZ': { zones: [31, 32, 33, 34, 35, 36, 37, 38, 39, 40] }
            }
        };
        
        // Map state names to their abbreviations for zone IDs
        this.stateAbbreviations = {
            'Alabama': 'AL',
            'Alaska': 'AK',
            'Arizona': 'AZ',
            'Arkansas': 'AR',
            'California': 'CA',
            'Colorado': 'CO',
            'Connecticut': 'CT',
            'Delaware': 'DE',
            'Florida': 'FL',
            'Georgia': 'GA',
            'Hawaii': 'HI',
            'Idaho': 'ID',
            'Illinois': 'IL',
            'Indiana': 'IN',
            'Iowa': 'IA',
            'Kansas': 'KS',
            'Kentucky': 'KY',
            'Louisiana': 'LA',
            'Maine': 'ME',
            'Maryland': 'MD',
            'Massachusetts': 'MA',
            'Michigan': 'MI',
            'Minnesota': 'MN',
            'Mississippi': 'MS',
            'Missouri': 'MO',
            'Montana': 'MT',
            'Nebraska': 'NE',
            'Nevada': 'NV',
            'New Hampshire': 'NH',
            'New Jersey': 'NJ',
            'New Mexico': 'NM',
            'New York': 'NY',
            'North Carolina': 'NC',
            'North Dakota': 'ND',
            'Ohio': 'OH',
            'Oklahoma': 'OK',
            'Oregon': 'OR',
            'Pennsylvania': 'PA',
            'Rhode Island': 'RI',
            'South Carolina': 'SC',
            'South Dakota': 'SD',
            'Tennessee': 'TN',
            'Texas': 'TX',
            'Utah': 'UT',
            'Vermont': 'VT',
            'Virginia': 'VA',
            'Washington': 'WA',
            'West Virginia': 'WV',
            'Wisconsin': 'WI',
            'Wyoming': 'WY'
        };
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async getWeatherAlerts(state) {
        try {
            const offices = this.stateOfficeMapping[state] || [];
            if (Object.keys(offices).length === 0) {
                console.log(`No weather offices configured for ${state}`);
                return [];
            }

            let allAlerts = [];
            let retryCount = 0;
            const maxRetries = 3;

            for (const office in offices) {
                const zones = offices[office].zones || [];
                if (zones.length === 0) {
                    console.log(`No zones configured for office ${office} in ${state}`);
                    continue;
                }

                for (const zone of zones) {
                    try {
                        // Add delay between requests to avoid rate limiting
                        await this.delay(1000);

                        // Format the zone ID correctly: state abbreviation + Z + three-digit number
                        const zoneId = `${this.stateAbbreviations[state]}Z${zone.toString().padStart(3, '0')}`;
                        console.log(`Fetching alerts for zone: ${zoneId}`);
                        
                        const alertsResponse = await axios.get(`${this.baseUrl}/alerts/active/zone/${zoneId}`, {
                            headers: {
                                'User-Agent': this.userAgent,
                                'Accept': 'application/geo+json'
                            },
                            timeout: 10000 // 10 second timeout
                        });

                        if (alertsResponse.data && alertsResponse.data.features) {
                            const alerts = alertsResponse.data.features;
                            console.log(`Found ${alerts.length} alerts for zone ${zoneId}`);
                            
                            const severeAlerts = alerts.filter(alert => {
                                const event = alert.properties.event;
                                const severity = alert.properties.severity;
                                const description = alert.properties.description || '';
                                const headline = alert.properties.headline || '';
                                
                                // Log every alert we find for debugging
                                console.log(`🔍 Analyzing alert: ${event}`);
                                console.log(`   Severity: ${severity || 'Not specified'}`);
                                console.log(`   Zone: ${zoneId}`);
                                console.log(`   Area: ${alert.properties.areaDesc || 'Not specified'}`);
                                
                                // Much more inclusive filtering - any storm-related event
                                const isSevereEvent = (
                                    // Tornado events
                                    event.includes('Tornado') ||
                                    // Thunderstorm events (any level)
                                    event.includes('Thunderstorm') ||
                                    event.includes('Storm') ||
                                    // Hail events (any size)
                                    event.includes('Hail') ||
                                    // Wind events (any severity)
                                    event.includes('Wind') ||
                                    // Hurricane/Tropical
                                    event.includes('Hurricane') ||
                                    event.includes('Tropical') ||
                                    // Flood events that could indicate severe storms
                                    event.includes('Flash Flood') ||
                                    // Any warning (not just watches)
                                    event.includes('Warning') ||
                                    // Check description for storm keywords
                                    description.toLowerCase().includes('hail') ||
                                    description.toLowerCase().includes('wind') ||
                                    description.toLowerCase().includes('storm') ||
                                    description.toLowerCase().includes('tornado') ||
                                    headline.toLowerCase().includes('storm') ||
                                    headline.toLowerCase().includes('wind') ||
                                    headline.toLowerCase().includes('hail')
                                );

                                // Less restrictive state checking - just check if it's in the right general area
                                const stateAbbrev = this.stateAbbreviations[state];
                                const isCorrectState = alert.properties.areaDesc.includes(stateAbbrev) || 
                                                     alert.properties.areaDesc.includes(state) ||
                                                     zoneId.startsWith(stateAbbrev); // If we're checking the zone, it should be the right state

                                if (isSevereEvent) {
                                    console.log(`✅ STORM EVENT FOUND: ${event}`);
                                    console.log(`   Will include in analysis: ${isSevereEvent && isCorrectState}`);
                                    if (!isCorrectState) {
                                        console.log(`   ⚠️ State mismatch - Expected: ${state}/${stateAbbrev}, Got: ${alert.properties.areaDesc}`);
                                    }
                                } else {
                                    console.log(`❌ Not a storm event: ${event}`);
                                }

                                return isSevereEvent && isCorrectState;
                            });

                            console.log(`Found ${severeAlerts.length} severe alerts for zone ${zoneId}`);
                            allAlerts = allAlerts.concat(severeAlerts);
                        }
                    } catch (zoneError) {
                        console.error(`Error fetching alerts for zone ${this.stateAbbreviations[state]}Z${zone.toString().padStart(3, '0')}:`, zoneError.message);
                        if (zoneError.response) {
                            console.error('Response status:', zoneError.response.status);
                            console.error('Response data:', zoneError.response.data);
                        }
                        
                        // Handle rate limiting
                        if (zoneError.response && zoneError.response.status === 429) {
                            const retryAfter = parseInt(zoneError.response.headers['retry-after']) || 60;
                            console.log(`Rate limited. Waiting ${retryAfter} seconds before retry...`);
                            await this.delay(retryAfter * 1000);
                            
                            if (retryCount < maxRetries) {
                                retryCount++;
                                console.log(`Retrying request (attempt ${retryCount} of ${maxRetries})...`);
                                // Retry this zone
                                zone--;
                                continue;
                            }
                        }
                        
                        // Continue with next zone
                        continue;
                    }
                }
            }

            console.log(`Total severe alerts found for ${state}: ${allAlerts.length}`);
            return allAlerts;
        } catch (error) {
            console.error(`Error fetching weather alerts for ${state}:`, error.message);
            if (error.response) {
                console.error('Response data:', error.response.data);
                console.error('Response status:', error.response.status);
                console.error('Response headers:', error.response.headers);
            }
            return [];
        }
    }

    async getRecentHistoricalAlerts(state, hoursBack = 2) {
        try {
            console.log(`🕐 Checking historical alerts for ${state} (past ${hoursBack} hours)...`);
            
            const offices = this.stateOfficeMapping[state] || [];
            if (Object.keys(offices).length === 0) {
                console.log(`No weather offices configured for ${state}`);
                return [];
            }

            let allHistoricalAlerts = [];
            const cutoffTime = new Date(Date.now() - (hoursBack * 60 * 60 * 1000));
            
            // Get alerts from the past few hours using the general alerts endpoint
            try {
                const stateAbbrev = this.stateAbbreviations[state];
                console.log(`📡 Fetching recent alerts for ${state} (${stateAbbrev})...`);
                
                const alertsResponse = await axios.get(`${this.baseUrl}/alerts`, {
                    headers: {
                        'User-Agent': this.userAgent,
                        'Accept': 'application/geo+json'
                    },
                    params: {
                        area: stateAbbrev,
                        limit: 500 // Get more alerts to ensure we catch recent ones
                    },
                    timeout: 15000
                });

                if (alertsResponse.data && alertsResponse.data.features) {
                    const alerts = alertsResponse.data.features;
                    console.log(`📋 Found ${alerts.length} total recent alerts for ${state}`);
                    
                    const recentStormAlerts = alerts.filter(alert => {
                        const event = alert.properties.event;
                        const onset = new Date(alert.properties.onset || alert.properties.sent);
                        const expires = new Date(alert.properties.expires || alert.properties.ends);
                        const description = alert.properties.description || '';
                        const headline = alert.properties.headline || '';
                        
                        // Check if this alert was active within our time window
                        const wasRecentlyActive = (
                            onset >= cutoffTime || // Started recently
                            expires >= cutoffTime || // Ended recently
                            (onset <= cutoffTime && expires >= new Date()) // Was active during our window
                        );
                        
                        // Same storm filtering as active alerts
                        const isSevereEvent = (
                            event.includes('Tornado') ||
                            event.includes('Thunderstorm') ||
                            event.includes('Storm') ||
                            event.includes('Hail') ||
                            event.includes('Wind') ||
                            event.includes('Hurricane') ||
                            event.includes('Tropical') ||
                            event.includes('Flash Flood') ||
                            event.includes('Warning') ||
                            description.toLowerCase().includes('hail') ||
                            description.toLowerCase().includes('wind') ||
                            description.toLowerCase().includes('storm') ||
                            description.toLowerCase().includes('tornado') ||
                            headline.toLowerCase().includes('storm') ||
                            headline.toLowerCase().includes('wind') ||
                            headline.toLowerCase().includes('hail')
                        );

                        if (isSevereEvent && wasRecentlyActive) {
                            console.log(`🕐 RECENT STORM FOUND: ${event}`);
                            console.log(`   Onset: ${onset.toLocaleString()}`);
                            console.log(`   Expires: ${expires.toLocaleString()}`);
                            console.log(`   Area: ${alert.properties.areaDesc}`);
                        }

                        return isSevereEvent && wasRecentlyActive;
                    });

                    console.log(`⚡ Found ${recentStormAlerts.length} recent storm alerts for ${state}`);
                    allHistoricalAlerts = recentStormAlerts;
                }
            } catch (error) {
                console.error(`Error fetching historical alerts for ${state}:`, error.message);
            }

            return allHistoricalAlerts;
        } catch (error) {
            console.error(`Error in getRecentHistoricalAlerts for ${state}:`, error.message);
            return [];
        }
    }

    async getComprehensiveWeatherAlerts(state) {
        console.log(`🌩️ Getting comprehensive weather data for ${state}...`);
        
        // Get both active and recent historical alerts
        const [activeAlerts, historicalAlerts] = await Promise.all([
            this.getWeatherAlerts(state),
            this.getRecentHistoricalAlerts(state, 2)
        ]);

        // Combine and deduplicate alerts
        const allAlerts = [...activeAlerts];
        
        // Add historical alerts that aren't already in active alerts
        for (const historical of historicalAlerts) {
            const isDuplicate = activeAlerts.some(active => 
                active.properties.id === historical.properties.id ||
                (active.properties.event === historical.properties.event &&
                 active.properties.areaDesc === historical.properties.areaDesc &&
                 Math.abs(new Date(active.properties.sent) - new Date(historical.properties.sent)) < 60000) // Within 1 minute
            );
            
            if (!isDuplicate) {
                allAlerts.push(historical);
            }
        }

        console.log(`📊 COMPREHENSIVE RESULTS for ${state}:`);
        console.log(`   Active alerts: ${activeAlerts.length}`);
        console.log(`   Historical alerts: ${historicalAlerts.length}`);
        console.log(`   Total unique alerts: ${allAlerts.length}`);

        return allAlerts;
    }
}

module.exports = WeatherService; 