const axios = require('axios');
const StormAnalyzer = require('./stormAnalyzer');

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

    isRoofDamageRelevant(alert) {
        const description = (alert.properties.description || "").toLowerCase();
        const event = (alert.properties.event || "").toLowerCase();
        const headline = (alert.properties.headline || "").toLowerCase();
        const fullText = description + " " + headline; // Combine for easier searching of general terms

        let hailSize = 0;
        let windSpeed = 0;

        // --- Hail Parsing --- 
        let potentialHailSizes = [];

        // Priority 1: NWS Structured Hail Parameter
        const maxHailRegex = /\* max hail size\.*(\d+(?:\.\d+)?)\s*in/ig; // global search
        let match;
        while ((match = maxHailRegex.exec(description)) !== null) {
            potentialHailSizes.push(parseFloat(match[1]));
        }

        // Priority 2: General textual hail reports (description & headline)
        const generalHailRegex = /(?:hail(?: of| up to)?|size hail)\s*\(?(\d+(?:\.\d+)?)\s*in(?:ch(?:es)?)?\)?/ig;
        while ((match = generalHailRegex.exec(fullText)) !== null) {
            potentialHailSizes.push(parseFloat(match[1]));
        }
        
        if (potentialHailSizes.length > 0) {
            hailSize = Math.max(...potentialHailSizes);
        }

        // --- Wind Parsing --- 
        let potentialWindSpeeds = [];

        // Priority 1: NWS Structured Wind Parameter
        const maxWindRegex = /\* max wind gust\.*(\d+)\s*mph/ig;
        while ((match = maxWindRegex.exec(description)) !== null) {
            potentialWindSpeeds.push(parseFloat(match[1]));
        }

        // Priority 2: Specific wind phrases (description & headline)
        const specificWindRegex = /(?:wind gusts(?: of)?|winds up to|wind speeds up to|gusts up to|wind speed of)\s*(\d+)\s*mph/ig;
        while ((match = specificWindRegex.exec(fullText)) !== null) {
            potentialWindSpeeds.push(parseFloat(match[1]));
        }

        // Priority 3: General MPH mention, conditional on event type (description & headline)
        if (event.includes("wind") || event.includes("thunderstorm") || event.includes("hurricane") || event.includes("tornado") || event.includes("tropical storm")) {
            const broaderWindRegex = /(\d+)\s*mph/ig;
            while ((match = broaderWindRegex.exec(fullText)) !== null) {
                potentialWindSpeeds.push(parseFloat(match[1]));
            }
        }
        
        if (potentialWindSpeeds.length > 0) {
            windSpeed = Math.max(...potentialWindSpeeds);
        }

        const originalEventForLog = alert.properties.event || "N/A";
        if (hailSize > 0 || windSpeed > 0) { 
            console.log(`[WeatherService DEBUG] Event: "${originalEventForLog}" | Potential Hail: [${potentialHailSizes.join(', ')}] -> Chosen: ${hailSize}in | Potential Wind: [${potentialWindSpeeds.join(', ')}] -> Chosen: ${windSpeed}mph`);
        }

        const qualifiesByHail = hailSize >= 1.0;
        const qualifiesByWind = windSpeed >= 58;
        
        let relevant = qualifiesByHail || qualifiesByWind;

        if (relevant) {
             console.log(`[WeatherService] Alert QUALIFIED: "${originalEventForLog}". Hail: ${hailSize}in (>=1.0: ${qualifiesByHail}), Wind: ${windSpeed}mph (>=58: ${qualifiesByWind})`);
        } else {
            // Log only if some conditions were parsed but didn't meet strict thresholds, or if event type seems relevant
            const isPotentiallyInteresting = hailSize > 0 || windSpeed > 0 || event.includes("hail") || event.includes("wind") || event.includes("thunderstorm") || event.includes("tornado") || event.includes("hurricane") || event.includes("tropical storm") || event.includes("warning") || event.includes("watch");
            if (isPotentiallyInteresting) {
                 console.log(`[WeatherService] Alert DID NOT QUALIFY: "${originalEventForLog}". Hail: ${hailSize}in (>=1.0: ${qualifiesByHail}), Wind: ${windSpeed}mph (>=58: ${qualifiesByWind})`);
            }
        }
        return relevant;
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
                            
                            const relevantAlerts = alerts.filter(a => this.isRoofDamageRelevant(a));
                            allAlerts = allAlerts.concat(relevantAlerts);

                            console.log(`Found ${relevantAlerts.length} roof-damage relevant alerts for zone ${zoneId}`);
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

            console.log(`[${state}] returning ${allAlerts.length} roof-damage alerts`);
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
                        const onset = new Date(alert.properties.onset || alert.properties.sent);
                        const expires = new Date(alert.properties.expires || alert.properties.ends);
                        
                        // Check if this alert was active within our time window
                        const wasRecentlyActive = (
                            onset >= cutoffTime || // Started recently
                            expires >= cutoffTime || // Ended recently
                            (onset <= cutoffTime && expires >= new Date()) // Was active during our window
                        );
                        
                        // Use the same roof damage relevant filter
                        const isRoofDamageRelevant = this.isRoofDamageRelevant(alert);

                        if (isRoofDamageRelevant && wasRecentlyActive) {
                            console.log(`🕐 RECENT STORM FOUND: ${alert.properties.event}`);
                            console.log(`   Onset: ${onset.toLocaleString()}`);
                            console.log(`   Expires: ${expires.toLocaleString()}`);
                            console.log(`   Area: ${alert.properties.areaDesc}`);
                        }

                        return isRoofDamageRelevant && wasRecentlyActive;
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
        console.log(`\n🌩️ Getting comprehensive weather data for ${state}...`);
        
        try {
            // Get historical alerts first
            console.log(`📋 Checking historical alerts for ${state} (past 2 hours)...`);
            const historicalAlerts = await this.getRecentHistoricalAlerts(state);
            console.log(`📊 Found ${historicalAlerts.length} historical alerts`);

            // Get current active alerts
            console.log(`🔍 Checking current active alerts for ${state}...`);
            const currentAlerts = await this.getWeatherAlerts(state);
            console.log(`📊 Found ${currentAlerts.length} active alerts`);

            // Combine and deduplicate alerts
            const allAlerts = [...currentAlerts, ...historicalAlerts];
            const uniqueAlerts = this.deduplicateAlerts(allAlerts);

            console.log(`\n📊 COMPREHENSIVE RESULTS for ${state}:`);
            console.log(`   Active alerts: ${currentAlerts.length}`);
            console.log(`   Historical alerts: ${historicalAlerts.length}`);
            console.log(`   Total unique alerts: ${uniqueAlerts.length}`);

            // Return the unique, pre-filtered alerts
            return uniqueAlerts;

        } catch (error) {
            console.error(`❌ Error getting comprehensive alerts for ${state}:`, error);
            return [];
        }
    }

    deduplicateAlerts(alerts) {
        const seen = new Set();
        return alerts.filter(alert => {
            const key = `${alert.properties.event}-${alert.properties.areaDesc}-${alert.properties.onset}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
}

module.exports = WeatherService;