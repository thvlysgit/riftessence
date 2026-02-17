"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var bcryptjs_1 = __importDefault(require("bcryptjs"));
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var user, hashedPassword, roles, regions, vcPrefs, duoTypes, descriptions, i, post;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('Starting test data setup...');
                    return [4 /*yield*/, prisma.user.findUnique({
                            where: { username: 'thomas' },
                        })];
                case 1:
                    user = _a.sent();
                    if (!user) {
                        console.error('User "thomas" not found in database!');
                        process.exit(1);
                    }
                    console.log("Found user: ".concat(user.username, " (ID: ").concat(user.id, ")"));
                    return [4 /*yield*/, bcryptjs_1.default.hash('T01102007b', 10)];
                case 2:
                    hashedPassword = _a.sent();
                    return [4 /*yield*/, prisma.user.update({
                            where: { id: user.id },
                            data: { password: hashedPassword },
                        })];
                case 3:
                    _a.sent();
                    console.log('✓ Password set successfully');
                    roles = [client_1.Role.TOP, client_1.Role.JUNGLE, client_1.Role.MID, client_1.Role.ADC, client_1.Role.SUPPORT];
                    regions = [client_1.Region.EUW, client_1.Region.NA, client_1.Region.EUNE, client_1.Region.KR];
                    vcPrefs = [client_1.VCPreference.ALWAYS, client_1.VCPreference.SOMETIMES, client_1.VCPreference.NEVER];
                    duoTypes = [client_1.DuoType.SHORT_TERM, client_1.DuoType.LONG_TERM, client_1.DuoType.BOTH];
                    descriptions = [
                        'Looking for chill duo partner to climb ranked!',
                        'Need a support main who can make plays',
                        'Searching for long-term duo, let\'s improve together',
                        'Want to play some normals and have fun',
                        'LF serious duo for challenger push',
                        'Casual player looking for friends to play with',
                        'Need jungle main who can gank my lane',
                        'Looking for ADC to synergize with',
                        'Want duo who communicates well',
                        'Searching for someone to play clash with',
                        'Need top laner for flex queue',
                        'Looking for mid laner with good roams',
                        'Want aggressive support to dominate bot lane',
                        'LF duo for late night gaming sessions',
                        'Need someone to help me improve',
                        'Looking for duo with positive mental',
                        'Want to spam ranked and climb fast',
                        'Searching for duo partner for new season',
                        'Need someone who plays tanks',
                        'Looking for carry player to duo with',
                    ];
                    console.log('\nCreating 20 mock duo posts...');
                    i = 0;
                    _a.label = 4;
                case 4:
                    if (!(i < 20)) return [3 /*break*/, 7];
                    return [4 /*yield*/, prisma.duoPost.create({
                            data: {
                                userId: user.id,
                                role: roles[i % roles.length],
                                region: regions[i % regions.length],
                                description: descriptions[i],
                                vcPreference: vcPrefs[i % vcPrefs.length],
                                duoType: duoTypes[i % duoTypes.length],
                                languages: i % 3 === 0 ? ['en', 'fr'] : i % 3 === 1 ? ['en', 'es'] : ['en'],
                                playstyles: i % 2 === 0 ? ['aggressive', 'shotcaller'] : ['supportive', 'flexible'],
                                active: true,
                            },
                        })];
                case 5:
                    post = _a.sent();
                    console.log("\u2713 Created post ".concat(i + 1, "/20 (ID: ").concat(post.id, ")"));
                    _a.label = 6;
                case 6:
                    i++;
                    return [3 /*break*/, 4];
                case 7:
                    console.log('\n✓ All test data setup complete!');
                    console.log('\nSummary:');
                    console.log("- Username: thomas");
                    console.log("- Password: T01102007b");
                    console.log("- Riot Account: Thvlys#9099");
                    console.log("- Created 20 mock duo posts");
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error('Error:', e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
