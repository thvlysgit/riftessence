import { LanguageCode } from '../contexts/LanguageContext';

export type TranslationKey = 
  // Common
  | 'common.loading'
  | 'common.save'
  | 'common.cancel'
  | 'common.delete'
  | 'common.edit'
  | 'common.confirm'
  | 'common.back'
  | 'common.next'
  | 'common.submit'
  | 'common.close'
  | 'common.search'
  | 'common.filter'
  | 'common.select'
  | 'common.username'
  | 'common.email'
  | 'common.password'
  | 'common.error'
  | 'common.success'
  | 'common.saving'
  | 'common.remove'
  | 'common.or'
  | 'common.optional'
  | 'common.required'
  | 'common.you'
  | 'common.rank.IRON'
  | 'common.rank.BRONZE'
  | 'common.rank.SILVER'
  | 'common.rank.GOLD'
  | 'common.rank.PLATINUM'
  | 'common.rank.EMERALD'
  | 'common.rank.DIAMOND'
  | 'common.rank.MASTER'
  | 'common.rank.GRANDMASTER'
  | 'common.rank.CHALLENGER'
  | 'common.rank.UNRANKED'
  
  // Navigation
  | 'nav.feed'
  | 'nav.lft'
  | 'nav.profile'
  | 'nav.settings'
  | 'nav.admin'
  | 'nav.logout'
  | 'nav.login'
  | 'nav.register'
  | 'nav.notifications'
  | 'nav.home'
  | 'nav.createPost'
  
  // Auth - Login
  | 'auth.welcomeBack'
  | 'auth.signInTo'
  | 'auth.usernameOrEmail'
  | 'auth.enterUsernameOrEmail'
  | 'auth.enterPassword'
  | 'auth.signingIn'
  | 'auth.signIn'
  | 'auth.signInWithRiot'
  | 'auth.noAccount'
  | 'auth.createOne'
  
  // Auth - Register
  | 'auth.createAccount'
  | 'auth.joinCommunity'
  | 'auth.chooseUsername'
  | 'auth.enterEmail'
  | 'auth.confirmPassword'
  | 'auth.enterConfirmPassword'
  | 'auth.creating'
  | 'auth.register'
  | 'auth.registerWithRiot'
  | 'auth.haveAccount'
  | 'auth.signInInstead'
  | 'auth.byRegistering'
  | 'auth.termsOfService'
  | 'auth.and'
  | 'auth.privacyPolicy'
  
  // Home Page
  | 'home.welcomeTo'
  | 'home.platform'
  | 'home.tagline'
  | 'home.getStarted'
  | 'home.whyTitle'
  | 'home.feature1Title'
  | 'home.feature1Description'
  | 'home.feature2Title'
  | 'home.feature2Description'
  | 'home.feature3Title'
  | 'home.feature3Description'
  | 'home.readyTitle'
  | 'home.readyDescription'
  | 'home.createFreeAccount'
  
  // Create Post
  | 'createPost.title'
  | 'createPost.user'
  | 'createPost.riotAccount'
  | 'createPost.noRiotAccounts'
  | 'createPost.role'
  | 'createPost.yourMostPlayed'
  | 'createPost.secondRole'
  | 'createPost.yourSecondMostPlayed'
  | 'createPost.message'
  | 'createPost.messagePlaceholder'
  | 'createPost.languages'
  | 'createPost.languagesFromProfile'
  | 'createPost.vcPreference'
  | 'createPost.lookingFor'
  | 'createPost.duoOnly'
  | 'createPost.flexGroupOnly'
  | 'createPost.both'
  | 'createPost.submit'
  | 'createPost.submitting'
  | 'createPost.success'
  | 'createPost.error'
  
  // Feed
  | 'feed.title'
  | 'feed.filters'
  | 'feed.allRegions'
  | 'feed.allRoles'
  | 'feed.allRanks'
  | 'feed.sortBy'
  | 'feed.newest'
  | 'feed.oldest'
  | 'feed.noPosts'
  | 'feed.noPostsDescription'
  | 'feed.createFirstPost'
  | 'feed.postedBy'
  | 'feed.mainRole'
  | 'feed.secondaryRole'
  | 'feed.lookingForDuo'
  | 'feed.lookingForFlex'
  | 'feed.lookingForBoth'
  | 'feed.viewProfile'
  | 'feed.deletePost'
  | 'feed.confirmDelete'
  
  // LFT (Looking For Team)
  | 'lft.title'
  | 'lft.createPlayer'
  | 'lft.createTeam'
  | 'lft.filters'
  | 'lft.playerListings'
  | 'lft.teamListings'
  | 'lft.noListings'
  | 'lft.availability'
  | 'lft.commitment'
  | 'lft.communication'
  | 'lft.skills'
  | 'lft.viewProfile'
  | 'lft.deletePost'
  
  // Coaching
  | 'coaching.title'
  | 'coaching.offerCoaching'
  | 'coaching.seekCoaching'
  | 'coaching.filters'
  | 'coaching.coachingOffers'
  | 'coaching.seekingCoaching'
  | 'coaching.noListings'
  | 'coaching.createOffer'
  | 'coaching.createRequest'
  | 'coaching.specializations'
  | 'coaching.availability'
  | 'coaching.roles'
  | 'coaching.languages'
  | 'coaching.details'
  | 'coaching.discordTag'
  | 'coaching.coachRank'
  | 'coaching.emeraldRequired'
  | 'coaching.waveManagement'
  | 'coaching.visionControl'
  | 'coaching.macro'
  | 'coaching.teamfighting'
  | 'coaching.laneControl'
  | 'coaching.championMastery'
  | 'coaching.viewProfile'
  | 'coaching.deletePost'
  | 'coaching.contactCoach'
  | 'coaching.contactStudent'
  | 'coaching.postType'
  | 'coaching.offering'
  | 'coaching.seeking'
  | 'coaching.detailsPlaceholder'
  | 'coaching.createSuccess'
  | 'coaching.createError'
  | 'coaching.deleteSuccess'
  | 'coaching.deleteError'
  
  // Footer
  | 'footer.tagline'
  | 'footer.legal'
  | 'footer.privacyPolicy'
  | 'footer.termsOfService'
  | 'footer.cookiePolicy'
  | 'footer.about'
  | 'footer.disclaimer'
  | 'footer.copyright'
  
  // Feedback Modal
  | 'feedback.title'
  | 'feedback.giveFeedbackFor'
  | 'feedback.skill'
  | 'feedback.personality'
  | 'feedback.commentary'
  | 'feedback.shareExperience'
  | 'feedback.errorMinRating'
  | 'feedback.submit'
  
  // Report Modal
  | 'report.title'
  | 'report.reportUser'
  | 'report.reason'
  | 'report.selectReason'
  | 'report.harassment'
  | 'report.spam'
  | 'report.inappropriate'
  | 'report.cheating'
  | 'report.other'
  | 'report.details'
  | 'report.provideDetails'
  | 'report.submit'
  | 'report.submitting'
  
  // Notifications
  | 'notifications.title'
  | 'notifications.markAllRead'
  | 'notifications.noNotifications'
  | 'notifications.justNow'
  | 'notifications.minutesAgo'
  | 'notifications.hoursAgo'
  | 'notifications.daysAgo'
  
  // Legal - Common
  | 'legal.backToHome'
  | 'legal.lastUpdated'
  | 'legal.contactUs'
  | 'legal.contactUsDescription'
  
  // Privacy Policy
  | 'privacy.title'
  | 'privacy.section1Title'
  | 'privacy.section1Description'
  | 'privacy.section1Item1'
  | 'privacy.section1Item2'
  | 'privacy.section1Item3'
  | 'privacy.section1Item4'
  | 'privacy.section1Item5'
  | 'privacy.section2Title'
  | 'privacy.section2Description'
  | 'privacy.section2Item1'
  | 'privacy.section2Item2'
  | 'privacy.section2Item3'
  | 'privacy.section2Item4'
  | 'privacy.section2Item5'
  | 'privacy.section2Item6'
  | 'privacy.section3Title'
  | 'privacy.section3Description'
  | 'privacy.section3Item1'
  | 'privacy.section3Item2'
  | 'privacy.section3Item3'
  | 'privacy.section4Title'
  | 'privacy.section4Description'
  | 'privacy.section5Title'
  | 'privacy.section5Description'
  | 'privacy.section5Item1'
  | 'privacy.section5Item2'
  | 'privacy.section5Item3'
  | 'privacy.section5Item4'
  | 'privacy.section6Title'
  | 'privacy.section6Description'
  | 'privacy.section7Title'
  | 'privacy.section7Description'
  | 'privacy.section8Title'
  | 'privacy.section8Description'
  
  // Terms of Service
  | 'terms.title'
  | 'terms.section1Title'
  | 'terms.section1Description'
  | 'terms.section2Title'
  | 'terms.section2Description'
  | 'terms.section2Item1'
  | 'terms.section2Item2'
  | 'terms.section2Item3'
  | 'terms.section2Item4'
  | 'terms.section2Item5'
  | 'terms.section3Title'
  | 'terms.section3Description1'
  | 'terms.section3Description2'
  | 'terms.section3Item1'
  | 'terms.section3Item2'
  | 'terms.section3Item3'
  | 'terms.section4Title'
  | 'terms.section4Description1'
  | 'terms.section4Description2'
  | 'terms.section4Item1'
  | 'terms.section4Item2'
  | 'terms.section4Item3'
  | 'terms.section4Item4'
  | 'terms.section4Item5'
  | 'terms.section5Title'
  | 'terms.section5Description'
  | 'terms.section5Item1'
  | 'terms.section5Item2'
  | 'terms.section5Item3'
  | 'terms.section5Item4'
  | 'terms.section5Item5'
  | 'terms.section5Item6'
  | 'terms.section6Title'
  | 'terms.section6Description1'
  | 'terms.section6Description2'
  | 'terms.section7Title'
  | 'terms.section7Description1'
  | 'terms.section7Description2'
  | 'terms.section8Title'
  | 'terms.section8Description'
  | 'terms.section9Title'
  | 'terms.section9Description'
  | 'terms.section10Title'
  | 'terms.section10Description'
  
  // Cookie Policy
  | 'cookies.title'
  | 'cookies.section1Title'
  | 'cookies.section1Description'
  | 'cookies.section2Title'
  | 'cookies.section2Description'
  | 'cookies.section2Item1'
  | 'cookies.section2Item2'
  | 'cookies.section2Item3'
  | 'cookies.section3Title'
  | 'cookies.section3Subtitle1'
  | 'cookies.section3Description1'
  | 'cookies.section3Item1a'
  | 'cookies.section3Item1b'
  | 'cookies.section3Subtitle2'
  | 'cookies.section3Description2'
  | 'cookies.section3Item2a'
  | 'cookies.section3Item2b'
  | 'cookies.section3Item2c'
  | 'cookies.section4Title'
  | 'cookies.section4Description'
  | 'cookies.section4Item1'
  | 'cookies.section4Item2'
  | 'cookies.section4Item3'
  | 'cookies.section4Item4'
  | 'cookies.section4Note'
  | 'cookies.section5Title'
  | 'cookies.section5Description'
  | 'cookies.section5Item1'
  | 'cookies.section5Item2'
  | 'cookies.section5Note'
  | 'cookies.section6Title'
  | 'cookies.section6Description'
  | 'cookies.section6Item1'
  | 'cookies.section6Item2'
  | 'cookies.section6Note'
  | 'cookies.section7Title'
  | 'cookies.section7Description'
  | 'cookies.section7Item1'
  | 'cookies.section7Item2'
  | 'cookies.section7Item3'
  | 'cookies.section8Title'
  | 'cookies.section8Description'
  | 'cookies.section9Description1'
  | 'cookies.section9Description2'
  
  // Profile
  | 'profile.editProfile'
  | 'profile.saveChanges'
  | 'profile.saving'
  | 'profile.refreshStats'
  | 'profile.giveFeedback'
  | 'profile.report'
  | 'profile.block'
  | 'profile.unblock'
  | 'profile.blocked'
  | 'profile.bio'
  | 'profile.playstyles'
  | 'profile.selectUpTo2Playstyles'
  | 'profile.noPlaystyles'
  | 'profile.languages'
  | 'profile.selectLanguages'
  | 'profile.noLanguages'
  | 'profile.voiceChat'
  | 'profile.championPool'
  | 'profile.riotAccounts'
  | 'profile.linkedRiotAccounts'
  | 'profile.mainAccount'
  | 'profile.hidden'
  | 'profile.verified'
  | 'profile.winrate'
  | 'profile.gamesPerDay'
  | 'profile.gamesPerWeek'
  | 'profile.lastPlayed'
  | 'profile.setAsMain'
  | 'profile.show'
  | 'profile.hide'
  | 'profile.removeAccount'
  | 'profile.noRiotAccounts'
  | 'profile.addRiotAccount'
  | 'profile.discord'
  | 'profile.bestRank'
  | 'profile.usernamePlaceholder'
  | 'profile.save.usernameSuccess'
  | 'profile.save.usernameError'
  | 'profile.save.languagesSuccess'
  | 'profile.save.languagesError'
  | 'profile.save.playstylesSuccess'
  | 'profile.save.playstylesError'
  | 'profile.save.maxPlaystyles'
  | 'profile.champion.invalid'
  | 'profile.status'
  | 'profile.status.flagged'
  | 'profile.status.reports'
  | 'profile.champion.search'
  | 'profile.champion.tier'
  | 'profile.mostPlayedRoles'
  | 'profile.acrossAccounts'
  | 'profile.ratings.skill'
  | 'profile.ratings.personality'
  | 'common.add'
  | 'common.language.english'
  | 'common.language.french'
  | 'common.language.spanish'
  | 'common.language.german'
  | 'common.language.italian'
  | 'common.language.portuguese'
  | 'common.language.polish'
  | 'common.language.russian'
  | 'common.language.turkish'
  | 'common.language.korean'
  | 'common.language.japanese'
  | 'common.language.chinese'
  | 'playstyle.controlledchaos'
  | 'playstyle.fundamentals'
  | 'playstyle.coinflips'
  | 'playstyle.scaling'
  | 'playstyle.snowball'
  | 'profile.role.top'
  | 'profile.role.jungle'
  | 'profile.role.middle'
  | 'profile.role.bottom'
  | 'profile.role.support'
  | 'profile.mostPlayedRole'
  | 'profile.mostPlayedRoles'
  | 'profile.acrossAccounts'
  | 'profile.loading'
  | 'profile.badge.admin.desc'
  | 'profile.badge.beta.desc'
  | 'profile.badge.verified.desc'
  | 'profile.badge.partner.desc'
  | 'profile.badge.mvp.desc'
  | 'profile.badge.goat.desc'
  | 'profile.badge.developer.desc'
  | 'profile.badge.support.desc'
  | 'profile.badge.earlysupporter.desc'
  | 'profile.badge.vip.desc'
  | 'profile.winrateSuffix'
  | 'profile.activity.title'
  | 'profile.activity.24h'
  | 'profile.activity.7d'
  | 'profile.activity.games'
  | 'common.rank.IRON'
  | 'common.rank.BRONZE'
  | 'common.rank.SILVER'
  | 'common.rank.GOLD'
  | 'common.rank.PLATINUM'
  | 'common.rank.EMERALD'
  | 'common.rank.DIAMOND'
  | 'common.rank.MASTER'
  | 'common.rank.GRANDMASTER'
  | 'common.rank.CHALLENGER'
  | 'common.rank.UNRANKED'
  | 'profile.bestRank'
  | 'profile.usernamePlaceholder'
  | 'profile.save.usernameSuccess'
  | 'profile.save.usernameError'
  | 'profile.save.languagesSuccess'
  | 'profile.save.languagesError'
  | 'profile.save.playstylesSuccess'
  | 'profile.save.playstylesError'
  | 'profile.save.maxPlaystyles'
  | 'profile.champion.invalid'
  | 'profile.discordAccount'
  | 'profile.discordLinked'
  | 'profile.notLinked'
  | 'profile.unlink'
  | 'profile.noDiscordAccount'
  | 'profile.communities'
  | 'profile.clickToViewCommunity'
  | 'profile.noCommunities'
  | 'profile.feedback'
  | 'profile.stars'
  | 'profile.moons'
  | 'profile.noFeedback'
  
  // Common
  | 'common.remove'
  
  // Settings
  | 'settings.title'
  | 'settings.language.title'
  | 'settings.language.description'
  | 'settings.theme.title'
  | 'settings.theme.description'
  | 'settings.account.title'
  | 'settings.account.username'
  | 'settings.account.email'
  | 'settings.account.status'
  | 'settings.account.verified'
  | 'settings.account.notVerified'
  | 'settings.password.title'
  | 'settings.password.description'
  | 'settings.password.new'
  | 'settings.password.confirm'
  | 'settings.password.set'
  | 'settings.password.setting'
  | 'settings.password.success'
  | 'settings.password.error.match'
  | 'settings.password.error.length'
  | 'settings.password.error.network'
  | 'settings.riot.title'
  | 'settings.riot.description'
  | 'settings.riot.manage'
  
  // Theme names
  | 'theme.classic'
  | 'theme.arcanePastel'
  | 'theme.nightshade'
  | 'theme.infernalEmber'
  | 'theme.radiantLight'
  | 'theme.oceanDepths'
  | 'theme.forestMystic'
  | 'theme.sunsetBlaze'
  | 'theme.shadowAssassin'
  | 'theme.clickToApply'
  
  // NoAccess Component
  | 'noAccess.profileRequired'
  | 'noAccess.profileRequiredDesc'
  | 'noAccess.createPostRequired'
  | 'noAccess.createPostRequiredDesc'
  | 'noAccess.findPlayersRequired'
  | 'noAccess.findPlayersRequiredDesc'
  | 'noAccess.findTeamRequired'
  | 'noAccess.findTeamRequiredDesc'
  | 'noAccess.goHome'
  | 'noAccess.close'
  | 'noAccess.signIn'
  | 'noAccess.createAccount'
  
  // Bug Report Component
  | 'bug.pleaseDescribe'
  | 'bug.submitSuccess'
  | 'bug.submitError'
  | 'bug.descriptionPlaceholder'
  | 'bug.reportBug'
  | 'bug.reportButton'
  
  // Navbar
  | 'navbar.searchPlaceholder'
  | 'navbar.noResults'
  | 'navbar.searching'
  
  // Onboarding Wizard
  | 'onboarding.linkRiotRequired'
  | 'onboarding.themeClassic'
  | 'onboarding.themeClassicDesc'
  | 'onboarding.themeInfernalEmber'
  | 'onboarding.themeInfernalEmberDesc'
  | 'onboarding.themeArcanePastel'
  | 'onboarding.themeArcanePastelDesc'
  | 'onboarding.themeNightshade'
  | 'onboarding.themeNightshadeDesc'
  | 'onboarding.themeRadiantLight'
  | 'onboarding.themeRadiantLightDesc'
  
  // Report Modal (additional)
  | 'report.reasonRequired'
  | 'report.reasonLabel'
  | 'report.detailsPlaceholder'
  
  // Admin
  | 'admin.broadcastTitle'
  | 'admin.broadcastDescription'
  | 'admin.broadcastPlaceholder'
  | 'admin.broadcastCharCount'
  | 'admin.broadcastPreview'
  | 'admin.broadcastSendButton'
  | 'admin.broadcastConfirm'
  | 'admin.broadcastSuccess'
  | 'admin.broadcastStats'
  | 'admin.broadcastTooShort'
  | 'admin.broadcastTooLong'
  
  // Matchups
  | 'matchups.title'
  | 'matchups.myLibrary'
  | 'matchups.createNew'
  | 'matchups.searchPlaceholder'
  | 'matchups.noMatchups'
  | 'matchups.myChampion'
  | 'matchups.enemyChampion'
  | 'matchups.role'
  | 'matchups.difficulty'
  | 'matchups.laningPhase'
  | 'matchups.teamFights'
  | 'matchups.items'
  | 'matchups.powerSpikes'
  | 'matchups.public'
  | 'matchups.private'
  | 'matchups.likes'
  | 'matchups.downloads'
  | 'matchups.edit'
  | 'matchups.delete'
  | 'matchups.confirmDelete'
  | 'matchups.deleted'
  | 'matchups.create'
  | 'matchups.editMatchup'
  | 'matchups.save'
  | 'matchups.update'
  | 'matchups.cancel'
  | 'matchups.makePublic'
  | 'matchups.titleLabel'
  | 'matchups.titlePlaceholder'
  | 'matchups.descriptionLabel'
  | 'matchups.descriptionPlaceholder'
  | 'matchups.marketplace'
  | 'matchups.browsePublic'
  | 'matchups.search'
  | 'matchups.sortBy'
  | 'matchups.newest'
  | 'matchups.mostLiked'
  | 'matchups.mostDownloaded'
  | 'matchups.download'
  | 'matchups.downloaded'
  | 'matchups.addToLibrary'
  | 'matchups.addedToLibrary'
  | 'matchups.removeFromLibrary'
  | 'matchups.removedFromLibrary'
  | 'matchups.like'
  | 'matchups.dislike'
  | 'matchups.author'
  | 'matchups.viewDetails'
  | 'matchups.togglePublic'
  | 'matchups.toggledPublic'
  | 'matchups.noPublicMatchups'
  | 'matchups.created'
  | 'matchups.updated'
  | 'matchups.laningNotesPlaceholder'
  | 'matchups.teamfightNotesPlaceholder'
  | 'matchups.itemNotesPlaceholder'
  | 'matchups.spikeNotesPlaceholder'
  | 'matchups.charactersRemaining'
  | 'matchups.fieldsRequired'
  | 'matchups.titleRequired'
  | 'matchups.difficulty.free_win'
  | 'matchups.difficulty.very_favorable'
  | 'matchups.difficulty.favorable'
  | 'matchups.difficulty.skill_matchup'
  | 'matchups.difficulty.hard'
  | 'matchups.difficulty.very_hard'
  | 'matchups.difficulty.free_lose'
  | 'common.loadMore';

export type Translations = Record<TranslationKey, string>;

export const translations: Record<LanguageCode, Translations> = {
  en: {
    // Common
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.confirm': 'Confirm',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.submit': 'Submit',
    'common.close': 'Close',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.select': 'Select',
    'common.remove': 'Remove',
    'common.username': 'Username',
    'common.email': 'Email',
    'common.password': 'Password',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.saving': 'Saving...',
    'common.or': 'Or',
    'common.optional': 'Optional',
    'common.required': 'Required',
    'common.you': 'you',
    'common.rank.IRON': 'Iron',
    'common.rank.BRONZE': 'Bronze',
    'common.rank.SILVER': 'Silver',
    'common.rank.GOLD': 'Gold',
    'common.rank.PLATINUM': 'Platinum',
    'common.rank.EMERALD': 'Emerald',
    'common.rank.DIAMOND': 'Diamond',
    'common.rank.MASTER': 'Master',
    'common.rank.GRANDMASTER': 'Grandmaster',
    'common.rank.CHALLENGER': 'Challenger',
    'common.rank.UNRANKED': 'Unranked',
    'profile.activity.title': 'Recent Activity',
    'profile.activity.24h': 'Last 24 Hours',
    'profile.activity.7d': 'Last 7 Days',
    'profile.activity.games': 'games',
    
    // Navigation
    'nav.feed': 'Feed',
    'nav.lft': 'LFT',
    'nav.profile': 'Profile',
    'nav.settings': 'Settings',
    'nav.admin': 'Admin',
    'nav.logout': 'Logout',
    'nav.login': 'Login',
    'nav.register': 'Register',
    'nav.notifications': 'Notifications',
    'nav.home': 'Home',
    'nav.createPost': 'Create Post',
    
    // Auth - Login
    'auth.welcomeBack': 'Welcome Back',
    'auth.signInTo': 'Sign in to your RiftEssence account',
    'auth.usernameOrEmail': 'Username or Email',
    'auth.enterUsernameOrEmail': 'Enter your username or email',
    'auth.enterPassword': 'Enter your password',
    'auth.signingIn': 'Signing in...',
    'auth.signIn': 'Sign In',
    'auth.signInWithRiot': 'Sign in with Riot Account',
    'auth.noAccount': "Don't have an account?",
    'auth.createOne': 'Create one',
    
    // Auth - Register
    'auth.createAccount': 'Create Account',
    'auth.joinCommunity': 'Join the RiftEssence community',
    'auth.chooseUsername': 'Choose a username',
    'auth.enterEmail': 'Enter your email',
    'auth.confirmPassword': 'Confirm Password',
    'auth.enterConfirmPassword': 'Confirm your password',
    'auth.creating': 'Creating account...',
    'auth.register': 'Create Account',
    'auth.registerWithRiot': 'Register with Riot Account',
    'auth.haveAccount': 'Already have an account?',
    'auth.signInInstead': 'Sign in instead',
    'auth.byRegistering': 'By registering, you agree to our',
    'auth.termsOfService': 'Terms of Service',
    'auth.and': 'and',
    'auth.privacyPolicy': 'Privacy Policy',
    
    // Home Page
    'home.welcomeTo': 'Welcome to',
    'home.platform': 'RiftEssence',
    'home.tagline': 'The ultimate platform for League of Legends players to find teammates, build communities, and connect with players who match your playstyle.',
    'home.getStarted': 'Get Started',
    'home.whyTitle': 'Why RiftEssence?',
    'home.feature1Title': 'Find Duo Partners',
    'home.feature1Description': 'Connect with players who match your role, rank, and playstyle preferences. Build lasting duos and climb together.',
    'home.feature2Title': 'Verified Accounts',
    'home.feature2Description': 'Link your Riot account for instant verification. See real ranks, winrates, and champion pools of potential teammates.',
    'home.feature3Title': 'Community Ratings',
    'home.feature3Description': 'Build your reputation through player ratings. See who\'s a great teammate and who to avoid before you queue up.',
    'home.readyTitle': 'Ready to find your perfect duo?',
    'home.readyDescription': 'Join thousands of players already on RiftEssence',
    'home.createFreeAccount': 'Create Free Account',
    
    // Create Post
    'createPost.title': 'Create Post',
    'createPost.user': 'User',
    'createPost.riotAccount': 'Riot Account',
    'createPost.noRiotAccounts': 'No linked Riot accounts. Please link an account to post.',
    'createPost.role': 'Role',
    'createPost.yourMostPlayed': '⭐ Your most played',
    'createPost.secondRole': 'Second Role',
    'createPost.yourSecondMostPlayed': '⭐ Your second most played',
    'createPost.message': 'Message',
    'createPost.messagePlaceholder': 'Looking for duo...',
    'createPost.languages': 'Languages',
    'createPost.languagesFromProfile': 'Languages (from profile)',
    'createPost.vcPreference': 'Voice Chat Preference',
    'createPost.lookingFor': 'Looking For',
    'createPost.duoOnly': 'Duo Only',
    'createPost.flexGroupOnly': 'Flex/Group Only',
    'createPost.both': 'Both',
    'createPost.submit': 'Post',
    'createPost.submitting': 'Posting...',
    'createPost.success': 'Post created successfully!',
    'createPost.error': 'Failed to create post',
    
    // Feed
    'feed.title': 'Feed',
    'feed.filters': 'Filters',
    'feed.allRegions': 'All Regions',
    'feed.allRoles': 'All Roles',
    'feed.allRanks': 'All Ranks',
    'feed.sortBy': 'Sort by',
    'feed.newest': 'Newest',
    'feed.oldest': 'Oldest',
    'feed.noPosts': 'No posts found',
    'feed.noPostsDescription': 'Be the first to create a post!',
    'feed.createFirstPost': 'Create Post',
    'feed.postedBy': 'Posted by',
    'feed.mainRole': 'Main Role',
    'feed.secondaryRole': 'Secondary Role',
    'feed.lookingForDuo': 'Looking for Duo',
    'feed.lookingForFlex': 'Looking for Flex/Group',
    'feed.lookingForBoth': 'Looking for Duo or Flex',
    'feed.viewProfile': 'View Profile',
    'feed.deletePost': 'Delete Post',
    'feed.confirmDelete': 'Are you sure you want to delete this post?',
    
    // LFT (Looking For Team)
    'lft.title': 'Looking For Team',
    'lft.createPlayer': 'Create Player Listing',
    'lft.createTeam': 'Create Team Listing',
    'lft.filters': 'Filters',
    'lft.playerListings': 'Player Listings',
    'lft.teamListings': 'Team Listings',
    'lft.noListings': 'No listings found',
    'lft.availability': 'Availability',
    'lft.commitment': 'Commitment',
    'lft.communication': 'Communication',
    'lft.skills': 'Skills',
    'lft.viewProfile': 'View Profile',
    'lft.deletePost': 'Delete Listing',
    
    // Coaching
    'coaching.title': 'Coaching',
    'coaching.offerCoaching': 'Offer Coaching',
    'coaching.seekCoaching': 'Seek Coaching',
    'coaching.filters': 'Filters',
    'coaching.coachingOffers': 'Coaching Offers',
    'coaching.seekingCoaching': 'Seeking Coaching',
    'coaching.noListings': 'No coaching posts found',
    'coaching.createOffer': 'Offer Your Coaching',
    'coaching.createRequest': 'Request Coaching',
    'coaching.specializations': 'Specializations',
    'coaching.availability': 'Availability',
    'coaching.roles': 'Roles',
    'coaching.languages': 'Languages',
    'coaching.details': 'Details',
    'coaching.discordTag': 'Discord Tag',
    'coaching.coachRank': 'Coach Rank',
    'coaching.emeraldRequired': 'Emerald+ Required to Offer Coaching',
    'coaching.waveManagement': 'Wave Management',
    'coaching.visionControl': 'Vision Control',
    'coaching.macro': 'Macro',
    'coaching.teamfighting': 'Teamfighting',
    'coaching.laneControl': 'Lane Control',
    'coaching.championMastery': 'Champion Mastery',
    'coaching.viewProfile': 'View Profile',
    'coaching.deletePost': 'Delete Post',
    'coaching.contactCoach': 'Contact Coach',
    'coaching.contactStudent': 'Contact Student',
    'coaching.postType': 'Post Type',
    'coaching.offering': 'Offering Coaching',
    'coaching.seeking': 'Seeking Coaching',
    'coaching.detailsPlaceholder': 'Describe your coaching approach, experience, or what you\'re looking to improve...',
    'coaching.createSuccess': 'Coaching post created successfully!',
    'coaching.createError': 'Failed to create coaching post',
    'coaching.deleteSuccess': 'Coaching post deleted successfully!',
    'coaching.deleteError': 'Failed to delete coaching post',
    
    // Footer
    'footer.tagline': 'The ultimate platform for League of Legends players to find teammates and build communities.',
    'footer.legal': 'Legal',
    'footer.privacyPolicy': 'Privacy Policy',
    'footer.termsOfService': 'Terms of Service',
    'footer.cookiePolicy': 'Cookie Policy',
    'footer.about': 'About',
    'footer.disclaimer': 'RiftEssence isn\'t endorsed by Riot Games and doesn\'t reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.',
    'footer.copyright': '© {year} RiftEssence. All rights reserved.',
    
    // Feedback Modal
    'feedback.title': 'Give Feedback',
    'feedback.giveFeedbackFor': 'Give Feedback for {username}',
    'feedback.skill': 'Skill (Stars)',
    'feedback.personality': 'Personality (Moons)',
    'feedback.commentary': 'Commentary (Optional)',
    'feedback.shareExperience': 'Share your experience...',
    'feedback.errorMinRating': 'Please rate both skill and personality (at least 1 star and 1 moon).',
    'feedback.submit': 'Submit',
    
    // Report Modal
    'report.title': 'Report User',
    'report.reportUser': 'Report {username}',
    'report.reason': 'Reason',
    'report.selectReason': 'Select a reason',
    'report.harassment': 'Harassment',
    'report.spam': 'Spam',
    'report.inappropriate': 'Inappropriate Content',
    'report.cheating': 'Cheating/Boosting',
    'report.other': 'Other',
    'report.details': 'Details',
    'report.provideDetails': 'Provide additional details...',
    'report.submit': 'Submit Report',
    'report.submitting': 'Submitting...',
    
    // Notifications
    'notifications.title': 'Notifications',
    'notifications.markAllRead': 'Mark all as read',
    'notifications.noNotifications': 'No notifications',
    'notifications.justNow': 'Just now',
    'notifications.minutesAgo': '{minutes}m ago',
    'notifications.hoursAgo': '{hours}h ago',
    'notifications.daysAgo': '{days}d ago',
    
    // Legal - Common
    'legal.backToHome': 'Back to Home',
    'legal.lastUpdated': 'Last updated: January 13, 2026',
    'legal.contactUs': 'Contact Us',
    'legal.contactUsDescription': 'If you have any questions about this Privacy Policy, please contact us through our support channels.',
    
    // Privacy Policy
    'privacy.title': 'Privacy Policy',
    'privacy.section1Title': '1. Information We Collect',
    'privacy.section1Description': 'We collect information you provide directly to us, including:',
    'privacy.section1Item1': 'Account information (username, email, password)',
    'privacy.section1Item2': 'Riot Games account information (summoner name, rank, region)',
    'privacy.section1Item3': 'Profile information (bio, preferred roles, champion pool)',
    'privacy.section1Item4': 'Posts, comments, and community interactions',
    'privacy.section1Item5': 'Ratings and feedback you provide to other users',
    'privacy.section2Title': '2. How We Use Your Information',
    'privacy.section2Description': 'We use the information we collect to:',
    'privacy.section2Item1': 'Provide, maintain, and improve our services',
    'privacy.section2Item2': 'Connect you with other League of Legends players',
    'privacy.section2Item3': 'Verify your Riot Games account ownership',
    'privacy.section2Item4': 'Display your profile and match history to other users',
    'privacy.section2Item5': 'Send you notifications and updates about your account',
    'privacy.section2Item6': 'Protect against fraud and abuse',
    'privacy.section3Title': '3. Information Sharing',
    'privacy.section3Description': 'We do not sell your personal information. We may share your information:',
    'privacy.section3Item1': 'With other users as part of your public profile',
    'privacy.section3Item2': 'With service providers who assist in operating our platform',
    'privacy.section3Item3': 'When required by law or to protect our rights',
    'privacy.section4Title': '4. Data Security',
    'privacy.section4Description': 'We implement reasonable security measures to protect your information. However, no method of transmission over the Internet is 100% secure.',
    'privacy.section5Title': '5. Your Rights',
    'privacy.section5Description': 'You have the right to:',
    'privacy.section5Item1': 'Access and update your personal information',
    'privacy.section5Item2': 'Delete your account and associated data',
    'privacy.section5Item3': 'Opt out of certain communications',
    'privacy.section5Item4': 'Request a copy of your data',
    'privacy.section6Title': '6. Cookies and Tracking',
    'privacy.section6Description': 'We use cookies and similar technologies to maintain your session and improve your experience. See our Cookie Policy for more details.',
    'privacy.section7Title': '7. Third-Party Services',
    'privacy.section7Description': 'We integrate with Riot Games API to verify accounts and display match data. We also use Discord for OAuth authentication. These services have their own privacy policies.',
    'privacy.section8Title': '8. Changes to This Policy',
    'privacy.section8Description': 'We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.',
    
    // Terms of Service
    'terms.title': 'Terms of Service',
    'terms.section1Title': '1. Acceptance of Terms',
    'terms.section1Description': 'By accessing and using RiftEssence, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these Terms of Service, please do not use our platform.',
    'terms.section2Title': '2. Use License',
    'terms.section2Description': 'Permission is granted to temporarily access RiftEssence for personal, non-commercial use only. This is the grant of a license, not a transfer of title. Under this license you may not:',
    'terms.section2Item1': 'Modify or copy the materials',
    'terms.section2Item2': 'Use the materials for any commercial purpose',
    'terms.section2Item3': 'Attempt to decompile or reverse engineer any software',
    'terms.section2Item4': 'Remove any copyright or proprietary notations',
    'terms.section2Item5': 'Transfer the materials to another person',
    'terms.section3Title': '3. User Accounts',
    'terms.section3Description1': 'When you create an account with us, you must provide accurate, complete, and current information. Failure to do so constitutes a breach of the Terms.',
    'terms.section3Description2': 'You are responsible for:',
    'terms.section3Item1': 'Safeguarding your password',
    'terms.section3Item2': 'Any activities or actions under your account',
    'terms.section3Item3': 'Notifying us immediately of any unauthorized use',
    'terms.section4Title': '4. User Content',
    'terms.section4Description1': 'You retain ownership of any content you post on RiftEssence. By posting content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, and display that content.',
    'terms.section4Description2': 'You agree not to post content that:',
    'terms.section4Item1': 'Is illegal, harmful, or abusive',
    'terms.section4Item2': 'Violates any third-party rights',
    'terms.section4Item3': 'Contains malware or malicious code',
    'terms.section4Item4': 'Is spam or unsolicited advertising',
    'terms.section4Item5': 'Impersonates another person or entity',
    'terms.section5Title': '5. Prohibited Activities',
    'terms.section5Description': 'You may not:',
    'terms.section5Item1': 'Use the platform for any illegal purpose',
    'terms.section5Item2': 'Harass, abuse, or harm other users',
    'terms.section5Item3': 'Create multiple accounts to manipulate ratings',
    'terms.section5Item4': 'Use automated tools (bots) without permission',
    'terms.section5Item5': 'Attempt to gain unauthorized access to our systems',
    'terms.section5Item6': 'Interfere with the proper functioning of the platform',
    'terms.section6Title': '6. Riot Games Disclaimer',
    'terms.section6Description1': 'RiftEssence was created under Riot Games\' "Legal Jibber Jabber" policy using assets owned by Riot Games. Riot Games does not endorse or sponsor this project.',
    'terms.section6Description2': 'RiftEssence isn\'t endorsed by Riot Games and doesn\'t reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.',
    'terms.section7Title': '7. Termination',
    'terms.section7Description1': 'We may terminate or suspend your account and access to the platform immediately, without prior notice or liability, for any reason, including breach of these Terms.',
    'terms.section7Description2': 'Upon termination, your right to use the platform will immediately cease.',
    'terms.section8Title': '8. Disclaimer of Warranties',
    'terms.section8Description': 'The platform is provided "as is" without warranties of any kind, either express or implied. We do not warrant that the platform will be uninterrupted, secure, or error-free.',
    'terms.section9Title': '9. Limitation of Liability',
    'terms.section9Description': 'In no event shall RiftEssence or its suppliers be liable for any damages arising out of the use or inability to use the platform.',
    'terms.section10Title': '10. Changes to Terms',
    'terms.section10Description': 'We reserve the right to modify these Terms at any time. We will notify you of any changes by posting the new Terms on this page and updating the "Last updated" date.',
    
    // Cookie Policy
    'cookies.title': 'Cookie Policy',
    'cookies.section1Title': '1. What Are Cookies',
    'cookies.section1Description': 'Cookies are small text files that are stored on your device when you visit our website. They help us provide you with a better experience by remembering your preferences and understanding how you use our platform.',
    'cookies.section2Title': '2. How We Use Cookies',
    'cookies.section2Description': 'We use cookies for the following purposes:',
    'cookies.section2Item1': 'Essential Cookies: Required for the platform to function properly, including authentication and session management',
    'cookies.section2Item2': 'Preference Cookies: Remember your settings and preferences (e.g., theme selection)',
    'cookies.section2Item3': 'Analytics Cookies: Help us understand how users interact with our platform (if implemented)',
    'cookies.section3Title': '3. Types of Cookies We Use',
    'cookies.section3Subtitle1': 'Session Cookies',
    'cookies.section3Description1': 'These are temporary cookies that expire when you close your browser. We use them to:',
    'cookies.section3Item1a': 'Maintain your login session',
    'cookies.section3Item1b': 'Remember your actions during a browsing session',
    'cookies.section3Subtitle2': 'Persistent Cookies',
    'cookies.section3Description2': 'These cookies remain on your device for a set period. We use them to:',
    'cookies.section3Item2a': 'Remember your login status',
    'cookies.section3Item2b': 'Save your theme preferences',
    'cookies.section3Item2c': 'Improve your experience on future visits',
    'cookies.section4Title': '4. Local Storage',
    'cookies.section4Description': 'In addition to cookies, we use browser local storage to:',
    'cookies.section4Item1': 'Store your JWT authentication token',
    'cookies.section4Item2': 'Cache your user preferences',
    'cookies.section4Item3': 'Save your theme selection',
    'cookies.section4Item4': 'Maintain application state between sessions',
    'cookies.section4Note': 'Local storage data persists until you clear your browser data or log out.',
    'cookies.section5Title': '5. Third-Party Cookies',
    'cookies.section5Description': 'We use the following third-party services that may set cookies:',
    'cookies.section5Item1': 'Cloudflare Turnstile: For bot protection and spam prevention',
    'cookies.section5Item2': 'Discord OAuth: When you authenticate using Discord',
    'cookies.section5Note': 'These third-party services have their own privacy policies and cookie policies.',
    'cookies.section6Title': '6. Managing Cookies',
    'cookies.section6Description': 'You can control and manage cookies in several ways:',
    'cookies.section6Item1': 'Browser Settings: Most browsers allow you to refuse or delete cookies. Check your browser\'s help documentation for instructions.',
    'cookies.section6Item2': 'Opt-Out: You can disable non-essential cookies through your browser settings.',
    'cookies.section6Note': 'Please note that disabling essential cookies may affect your ability to use certain features of our platform, including logging in and maintaining your session.',
    'cookies.section7Title': '7. Cookie Retention',
    'cookies.section7Description': 'Different cookies have different retention periods:',
    'cookies.section7Item1': 'Session cookies: Deleted when you close your browser',
    'cookies.section7Item2': 'Authentication tokens: Typically expire after 7 days',
    'cookies.section7Item3': 'Preference cookies: Persist until you clear them or change your preferences',
    'cookies.section8Title': '8. Updates to This Policy',
    'cookies.section8Description': 'We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons.',
    'cookies.section9Description1': 'If you have questions about our use of cookies, please contact us through our support channels.',
    'cookies.section9Description2': 'For more information about how we handle your personal data, please see our Privacy Policy.',

    
    // Profile
    'profile.editProfile': 'Edit Profile',
    'profile.saveChanges': '💾 Save Changes',
    'profile.saving': '⏳ Saving...',
    'profile.refreshStats': 'Refresh Stats',
    'profile.giveFeedback': 'Give Feedback',
    'profile.report': 'Report',
    'profile.block': 'Block',
    'profile.unblock': 'Unblock',
    'profile.blocked': 'Blocked',
    'profile.bio': 'Bio',
    'profile.playstyles': 'Playstyles',
    'profile.selectUpTo2Playstyles': 'Select up to 2 playstyles:',
    'profile.noPlaystyles': 'No playstyles selected',
    'profile.languages': 'Languages',
    'profile.selectLanguages': 'Select languages you speak:',
    'profile.noLanguages': 'No languages selected',
    'profile.voiceChat': 'Voice Chat',
    'profile.championPool': 'Champion Pool',
    'profile.riotAccounts': 'Riot Accounts',
    'profile.linkedRiotAccounts': 'Linked Riot Accounts',
    'profile.mainAccount': 'Main Account',
    'profile.hidden': 'Hidden',
    'profile.verified': 'Verified',
    'profile.winrate': 'Winrate',
    'profile.gamesPerDay': 'Games/Day',
    'profile.gamesPerWeek': 'Games/Week',
    'profile.lastPlayed': 'Last Played',
    'profile.setAsMain': 'Set as Main',
    'profile.show': 'Show',
    'profile.hide': 'Hide',
    'profile.removeAccount': 'Remove Account',
    'profile.noRiotAccounts': 'No Riot accounts linked',
    'profile.addRiotAccount': 'Add Riot Account',
    'profile.discord': 'Discord',
    'profile.discordAccount': 'Discord Account',
    'profile.discordLinked': 'Discord Linked',
    'profile.notLinked': 'Not Linked',
    'profile.unlink': 'Unlink',
    'profile.noDiscordAccount': 'No Discord account linked',
    'profile.bestRank': 'Best Rank:',
    'profile.usernamePlaceholder': 'Username',
    'profile.save.usernameSuccess': 'Username updated! ✨',
    'profile.save.usernameError': 'Failed to save username: {error}',
    'profile.save.languagesSuccess': 'Languages updated!',
    'profile.save.languagesError': 'Failed to save languages: {error}',
    'profile.save.playstylesSuccess': 'Playstyles updated!',
    'profile.save.playstylesError': 'Failed to save playstyles: {error}',
    'profile.save.maxPlaystyles': 'You can only select up to 2 playstyles',
    'profile.champion.invalid': 'Invalid champion(s): {champs}',
    'profile.loading': 'Loading profile...',
    'profile.role.top': 'Top',
    'profile.role.jungle': 'Jungle',
    'profile.role.middle': 'Mid',
    'profile.role.bottom': 'Bot',
    'profile.role.support': 'Support',
    'profile.mostPlayedRole': 'Most Played Role:',
    'profile.status': 'Status',
    'profile.status.flagged': 'Flagged',
    'profile.status.reports': '{count} report(s)',
    'profile.champion.search': 'Search champion to add to a tier...',
    'profile.champion.tier': 'Tier {tier}',
    'profile.mostPlayedRoles': 'Most Played Role(s):',
    'profile.acrossAccounts': 'Across all linked accounts',
    'profile.ratings.skill': 'Skill ({count} ratings)',
    'profile.ratings.personality': 'Personality ({count} ratings)',
    'common.add': 'Add',
    'common.language.english': 'English',
    'common.language.french': 'French',
    'common.language.spanish': 'Spanish',
    'common.language.german': 'German',
    'common.language.italian': 'Italian',
    'common.language.portuguese': 'Portuguese',
    'common.language.polish': 'Polish',
    'common.language.russian': 'Russian',
    'common.language.turkish': 'Turkish',
    'common.language.korean': 'Korean',
    'common.language.japanese': 'Japanese',
    'common.language.chinese': 'Chinese',
    'playstyle.controlledchaos': 'Controlled Chaos',
    'playstyle.fundamentals': 'Fundamentals',
    'playstyle.coinflips': 'Coin Flips',
    'playstyle.scaling': 'Scaling',
    'playstyle.snowball': 'Snowball',
    'profile.badge.developer.desc': 'Bypass cooldowns',
    'profile.badge.support.desc': 'Support team member',
    'profile.badge.earlysupporter.desc': 'Joined during beta',
    'profile.badge.vip.desc': 'VIP member',
    'profile.badge.admin.desc': 'Site Administrator',
    'profile.badge.beta.desc': 'Early adopter',
    'profile.badge.verified.desc': 'Verified identity',
    'profile.badge.partner.desc': 'Official partner',
    'profile.badge.mvp.desc': 'Most valuable player',
    'profile.badge.goat.desc': 'Greatest of all time',
    'profile.winrateSuffix': '% WR',
    'profile.communities': 'Communities',
    'profile.clickToViewCommunity': 'Click to view community page',
    'profile.noCommunities': 'No communities yet',
    'profile.feedback': 'Feedback',
    'profile.stars': 'Stars',
    'profile.moons': 'Moons',
    'profile.noFeedback': 'No feedback yet',
    
    // Settings
    'settings.title': 'Account Settings',
    'settings.language.title': 'Language',
    'settings.language.description': 'Select your preferred language for the user interface.',
    'settings.theme.title': 'Theme',
    'settings.theme.description': 'Choose your preferred color theme for the application.',
    'settings.account.title': 'Account Information',
    'settings.account.username': 'Username',
    'settings.account.email': 'Email',
    'settings.account.status': 'Account Status',
    'settings.account.verified': '✓ Verified',
    'settings.account.notVerified': 'Not Verified',
    'settings.password.title': 'Password',
    'settings.password.description': 'Set a password to enable password-based login. This allows you to sign in without linking a Riot account.',
    'settings.password.new': 'New Password',
    'settings.password.confirm': 'Confirm new password',
    'settings.password.set': 'Set Password',
    'settings.password.setting': 'Saving...',
    'settings.password.success': 'Password set successfully! You can now log in with your password.',
    'settings.password.error.match': 'Passwords do not match',
    'settings.password.error.length': 'Password must be at least 6 characters',
    'settings.password.error.network': 'Network error',
    'settings.riot.title': 'Riot Account',
    'settings.riot.description': 'Link your Riot account to verify your rank and access additional features.',
    'settings.riot.manage': 'Manage Riot Accounts',
    
    // Theme names
    'theme.classic': 'Classic Dark',
    'theme.arcanePastel': 'Arcane Pastel',
    'theme.nightshade': 'Nightshade',
    'theme.infernalEmber': 'Infernal Ember',
    'theme.radiantLight': 'Radiant Light',
    'theme.oceanDepths': 'Ocean Depths',
    'theme.forestMystic': 'Forest Mystic',
    'theme.sunsetBlaze': 'Sunset Blaze',
    'theme.shadowAssassin': 'Shadow Assassin',
    'theme.clickToApply': 'Click to apply',
    
    // NoAccess Component
    'noAccess.profileRequired': 'Profile Access Required',
    'noAccess.profileRequiredDesc': 'You need to be logged in to view profiles. Sign in to access player profiles and connect with the League of Legends community.',
    'noAccess.createPostRequired': 'Sign In to Create Posts',
    'noAccess.createPostRequiredDesc': 'Create an account or sign in to share posts, connect with other players, and join the conversation.',
    'noAccess.findPlayersRequired': 'Sign In to Find Players',
    'noAccess.findPlayersRequiredDesc': 'Create an account or sign in to browse player profiles, find teammates, and build your dream team.',
    'noAccess.findTeamRequired': 'Sign In to Find Teams',
    'noAccess.findTeamRequiredDesc': 'Create an account or sign in to discover communities, join teams, and compete together.',
    'noAccess.goHome': 'Go Home',
    'noAccess.close': 'Close',
    'noAccess.signIn': 'Sign In',
    'noAccess.createAccount': 'Create Account',
    
    // Bug Report Component
    'bug.pleaseDescribe': 'Please describe the bug',
    'bug.submitSuccess': 'Bug report submitted! Thank you!',
    'bug.submitError': 'Failed to submit bug report. Please try again.',
    'bug.descriptionPlaceholder': 'What bug or error did you encounter?',
    'bug.reportBug': 'Report Bug',
    'bug.reportButton': '🐛 Report Bug',
    
    // Navbar
    'navbar.searchPlaceholder': 'Search summoners...',
    'navbar.noResults': 'No results found',
    'navbar.searching': 'Searching...',
    
    // Onboarding Wizard
    'onboarding.linkRiotRequired': 'Please link your Riot account to continue',
    'onboarding.themeClassic': 'Classic',
    'onboarding.themeClassicDesc': 'Clean and timeless',
    'onboarding.themeInfernalEmber': 'Infernal Ember',
    'onboarding.themeInfernalEmberDesc': 'Fiery and intense',
    'onboarding.themeArcanePastel': 'Arcane Pastel',
    'onboarding.themeArcanePastelDesc': 'Soft and magical',
    'onboarding.themeNightshade': 'Nightshade',
    'onboarding.themeNightshadeDesc': 'Dark and mysterious',
    'onboarding.themeRadiantLight': 'Radiant Light',
    'onboarding.themeRadiantLightDesc': 'Bright and uplifting',
    
    // Report Modal (additional)
    'report.reasonRequired': 'Please provide a reason for the report.',
    'report.reasonLabel': 'Reason for report',
    'report.detailsPlaceholder': 'Describe why you are reporting this user...',
    
    // Admin
    'admin.broadcastTitle': 'Broadcast System Message',
    'admin.broadcastDescription': 'Send a message from "System" to all users',
    'admin.broadcastPlaceholder': 'Enter your system message here...',
    'admin.broadcastCharCount': 'characters',
    'admin.broadcastPreview': 'Message Preview',
    'admin.broadcastSendButton': 'Send to All Users',
    'admin.broadcastConfirm': 'Are you sure you want to send this message to ALL users? This action cannot be undone.',
    'admin.broadcastSuccess': 'Successfully sent message to all users!',
    'admin.broadcastStats': 'Users: {users}, Conversations: {convos}, Messages: {msgs}',
    'admin.broadcastTooShort': 'Message must be at least 10 characters',
    'admin.broadcastTooLong': 'Message exceeds 2000 character limit',
    
    // Matchups
    'matchups.title': 'Matchups',
    'matchups.myLibrary': 'My Library',
    'matchups.createNew': 'Create New Matchup',
    'matchups.searchPlaceholder': 'Search by champion...',
    'matchups.noMatchups': 'No matchups yet. Create your first matchup guide!',
    'matchups.myChampion': 'My Champion',
    'matchups.enemyChampion': 'Enemy Champion',
    'matchups.role': 'Role',
    'matchups.difficulty': 'Difficulty',
    'matchups.laningPhase': 'Laning Phase',
    'matchups.teamFights': 'Team Fights',
    'matchups.items': 'Items & Runes',
    'matchups.powerSpikes': 'Power Spikes',
    'matchups.public': 'Public',
    'matchups.private': 'Private',
    'matchups.likes': 'Likes',
    'matchups.downloads': 'Downloads',
    'matchups.edit': 'Edit',
    'matchups.delete': 'Delete',
    'matchups.confirmDelete': 'Are you sure you want to delete this matchup?',
    'matchups.deleted': 'Matchup deleted successfully',
    'matchups.create': 'Create Matchup',
    'matchups.editMatchup': 'Edit Matchup',
    'matchups.save': 'Save',
    'matchups.update': 'Update',
    'matchups.cancel': 'Cancel',
    'matchups.makePublic': 'Make this matchup public',
    'matchups.titleLabel': 'Title',
    'matchups.titlePlaceholder': 'e.g., Darius vs Teemo - Complete Guide',
    'matchups.descriptionLabel': 'Description',
    'matchups.descriptionPlaceholder': 'Brief description for marketplace',
    'matchups.marketplace': 'Marketplace',
    'matchups.browsePublic': 'Browse Marketplace',
    'matchups.search': 'Search by champion...',
    'matchups.sortBy': 'Sort By',
    'matchups.newest': 'Newest',
    'matchups.mostLiked': 'Most Liked',
    'matchups.mostDownloaded': 'Most Downloaded',
    'matchups.download': 'Download',
    'matchups.downloaded': 'Downloaded successfully',
    'matchups.addToLibrary': 'Add to Library',
    'matchups.addedToLibrary': 'Added to your library',
    'matchups.removeFromLibrary': 'Remove from Library',
    'matchups.removedFromLibrary': 'Removed from your library',
    'matchups.like': 'Like',
    'matchups.dislike': 'Dislike',
    'matchups.author': 'Author',
    'matchups.viewDetails': 'View Details',
    'matchups.togglePublic': 'Toggle Public',
    'matchups.toggledPublic': 'Matchup visibility updated',
    'matchups.noPublicMatchups': 'No public matchups found. Be the first to share!',
    'matchups.created': 'Matchup created successfully',
    'matchups.updated': 'Matchup updated successfully',
    'matchups.laningNotesPlaceholder': 'How to play the early game, wave management, trading patterns...',
    'matchups.teamfightNotesPlaceholder': 'Positioning, priority targets, combos...',
    'matchups.itemNotesPlaceholder': 'Core items, situational builds, runes...',
    'matchups.spikeNotesPlaceholder': 'Level 2, 6, item breakpoints...',
    'matchups.charactersRemaining': 'characters remaining',
    'matchups.fieldsRequired': 'Role, My Champion, and Enemy Champion are required',
    'matchups.titleRequired': 'Title is required for public matchups',
    'matchups.difficulty.free_win': 'Free Win',
    'matchups.difficulty.very_favorable': 'Very Favorable',
    'matchups.difficulty.favorable': 'Favorable',
    'matchups.difficulty.skill_matchup': 'Skill Matchup',
    'matchups.difficulty.hard': 'Hard',
    'matchups.difficulty.very_hard': 'Very Hard',
    'matchups.difficulty.free_lose': 'Free Lose',
    'common.loadMore': 'Load More',
  },
  
  fr: {
    // Common
    'common.loading': 'Chargement...',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.confirm': 'Confirmer',
    'common.back': 'Retour',
    'common.next': 'Suivant',
    'common.submit': 'Soumettre',
    'common.close': 'Fermer',
    'common.search': 'Rechercher',
    'common.filter': 'Filtrer',
    'common.select': 'Sélectionner',
    'common.remove': 'Supprimer',
    'common.username': "Nom d'utilisateur",
    'common.email': 'Email',
    'common.password': 'Mot de passe',
    'common.error': 'Erreur',
    'common.success': 'Succès',
    'common.saving': 'Enregistrement...',
    'common.or': 'Ou',
    'common.optional': 'Facultatif',
    'common.required': 'Obligatoire',
    'common.you': 'vous',
    'common.rank.IRON': 'Fer',
    'common.rank.BRONZE': 'Bronze',
    'common.rank.SILVER': 'Argent',
    'common.rank.GOLD': 'Or',
    'common.rank.PLATINUM': 'Platine',
    'common.rank.EMERALD': 'Émeraude',
    'common.rank.DIAMOND': 'Diamant',
    'common.rank.MASTER': 'Maître',
    'common.rank.GRANDMASTER': 'Grand Maître',
    'common.rank.CHALLENGER': 'Challenger',
    'common.rank.UNRANKED': 'Non classé',
    'profile.activity.title': 'Activité récente',
    'profile.activity.24h': 'Dernières 24 heures',
    'profile.activity.7d': 'Derniers 7 jours',
    'profile.activity.games': 'parties',
    
    // Navigation
    'nav.feed': 'Fil',
    'nav.lft': 'LFT',
    'nav.profile': 'Profil',
    'nav.settings': 'Paramètres',
    'nav.admin': 'Admin',
    'nav.logout': 'Déconnexion',
    'nav.login': 'Connexion',
    'nav.register': 'Inscription',
    'nav.notifications': 'Notifications',
    'nav.home': 'Accueil',
    'nav.createPost': 'Créer une annonce',
    
    // Auth - Login
    'auth.welcomeBack': 'Bienvenue',
    'auth.signInTo': 'Connectez-vous à votre compte RiftEssence',
    'auth.usernameOrEmail': "Nom d'utilisateur ou Email",
    'auth.enterUsernameOrEmail': "Entrez votre nom d'utilisateur ou email",
    'auth.enterPassword': 'Entrez votre mot de passe',
    'auth.signingIn': 'Connexion...',
    'auth.signIn': 'Se connecter',
    'auth.signInWithRiot': 'Se connecter avec Riot',
    'auth.noAccount': "Pas encore de compte ?",
    'auth.createOne': 'Créer un compte',
    
    // Auth - Register
    'auth.createAccount': 'Créer un compte',
    'auth.joinCommunity': 'Rejoignez la communauté RiftEssence',
    'auth.chooseUsername': "Choisissez un nom d'utilisateur",
    'auth.enterEmail': 'Entrez votre email',
    'auth.confirmPassword': 'Confirmer le mot de passe',
    'auth.enterConfirmPassword': 'Confirmez votre mot de passe',
    'auth.creating': 'Création...',
    'auth.register': 'Créer un compte',
    'auth.registerWithRiot': "S'inscrire avec Riot",
    'auth.haveAccount': 'Vous avez déjà un compte ?',
    'auth.signInInstead': 'Se connecter',
    'auth.byRegistering': "En vous inscrivant, vous acceptez nos",
    'auth.termsOfService': "Conditions d'utilisation",
    'auth.and': 'et notre',
    'auth.privacyPolicy': 'Politique de confidentialité',
    
    // Home Page
    'home.welcomeTo': 'Bienvenue sur',
    'home.platform': 'RiftEssence',
    'home.tagline': 'La plateforme ultime pour les joueurs de League of Legends qui cherchent des coéquipiers, créent des communautés et se connectent avec des joueurs qui correspondent à leur style de jeu.',
    'home.getStarted': 'Commencer',
    'home.whyTitle': 'Pourquoi RiftEssence ?',
    'home.feature1Title': 'Trouvez des partenaires',
    'home.feature1Description': 'Connectez-vous avec des joueurs qui correspondent à votre rôle, rang et style de jeu. Créez des duos durables et grimpez ensemble.',
    'home.feature2Title': 'Comptes vérifiés',
    'home.feature2Description': 'Liez votre compte Riot pour une vérification instantanée. Consultez les vrais rangs, taux de victoire et pools de champions des coéquipiers potentiels.',
    'home.feature3Title': 'Évaluations communautaires',
    'home.feature3Description': 'Construisez votre réputation grâce aux évaluations des joueurs. Découvrez qui est un excellent coéquipier et qui éviter avant de vous lancer.',
    'home.readyTitle': 'Prêt à trouver votre duo parfait ?',
    'home.readyDescription': 'Rejoignez les milliers de joueurs déjà sur RiftEssence',
    'home.createFreeAccount': 'Créer un compte gratuit',
    
    // Create Post
    'createPost.title': 'Créer une annonce',
    'createPost.user': 'Utilisateur',
    'createPost.riotAccount': 'Compte Riot',
    'createPost.noRiotAccounts': "Aucun compte Riot lié. Veuillez lier un compte pour publier.",
    'createPost.role': 'Rôle',
    'createPost.yourMostPlayed': '⭐ Votre plus joué',
    'createPost.secondRole': 'Second rôle',
    'createPost.yourSecondMostPlayed': '⭐ Votre deuxième plus joué',
    'createPost.message': 'Message',
    'createPost.messagePlaceholder': 'Recherche duo...',
    'createPost.languages': 'Langues',
    'createPost.languagesFromProfile': 'Langues (depuis le profil)',
    'createPost.vcPreference': 'Préférence vocal',
    'createPost.lookingFor': 'Recherche',
    'createPost.duoOnly': 'Duo uniquement',
    'createPost.flexGroupOnly': 'Flex/Groupe uniquement',
    'createPost.both': 'Les deux',
    'createPost.submit': 'Publier',
    'createPost.submitting': 'Publication...',
    'createPost.success': 'Annonce créée avec succès !',
    'createPost.error': 'Échec de la création de l\'annonce',
    
    // Feed
    'feed.title': 'Fil',
    'feed.filters': 'Filtres',
    'feed.allRegions': 'Toutes les régions',
    'feed.allRoles': 'Tous les rôles',
    'feed.allRanks': 'Tous les rangs',
    'feed.sortBy': 'Trier par',
    'feed.newest': 'Plus récent',
    'feed.oldest': 'Plus ancien',
    'feed.noPosts': 'Aucune annonce trouvée',
    'feed.noPostsDescription': 'Soyez le premier à créer une annonce !',
    'feed.createFirstPost': 'Créer une annonce',
    'feed.postedBy': 'Publié par',
    'feed.mainRole': 'Rôle principal',
    'feed.secondaryRole': 'Rôle secondaire',
    'feed.lookingForDuo': 'Recherche Duo',
    'feed.lookingForFlex': 'Recherche Flex/Groupe',
    'feed.lookingForBoth': 'Recherche Duo ou Flex',
    'feed.viewProfile': 'Voir le profil',
    'feed.deletePost': 'Supprimer l\'annonce',
    'feed.confirmDelete': 'Êtes-vous sûr de vouloir supprimer cette annonce ?',
    
    // LFT (Looking For Team)
    'lft.title': 'Recherche Équipe',
    'lft.createPlayer': 'Créer annonce joueur',
    'lft.createTeam': 'Créer annonce équipe',
    'lft.filters': 'Filtres',
    'lft.playerListings': 'Annonces joueurs',
    'lft.teamListings': 'Annonces équipes',
    'lft.noListings': 'Aucune annonce trouvée',
    'lft.availability': 'Disponibilité',
    'lft.commitment': 'Engagement',
    'lft.communication': 'Communication',
    'lft.skills': 'Compétences',
    'lft.viewProfile': 'Voir le profil',
    'lft.deletePost': 'Supprimer l\'annonce',
    
    // Coaching
    'coaching.title': 'Coaching',
    'coaching.offerCoaching': 'Offrir du Coaching',
    'coaching.seekCoaching': 'Chercher du Coaching',
    'coaching.filters': 'Filtres',
    'coaching.coachingOffers': 'Offres de Coaching',
    'coaching.seekingCoaching': 'Recherche de Coaching',
    'coaching.noListings': 'Aucune annonce de coaching trouvée',
    'coaching.createOffer': 'Offrir Votre Coaching',
    'coaching.createRequest': 'Demander du Coaching',
    'coaching.specializations': 'Spécialisations',
    'coaching.availability': 'Disponibilité',
    'coaching.roles': 'Rôles',
    'coaching.languages': 'Langues',
    'coaching.details': 'Détails',
    'coaching.discordTag': 'Tag Discord',
    'coaching.coachRank': 'Rang du Coach',
    'coaching.emeraldRequired': 'Emeraude+ requis pour offrir du coaching',
    'coaching.waveManagement': 'Gestion des Vagues',
    'coaching.visionControl': 'Contrôle de Vision',
    'coaching.macro': 'Macro',
    'coaching.teamfighting': 'Combats d\'Équipe',
    'coaching.laneControl': 'Contrôle de Lane',
    'coaching.championMastery': 'Maîtrise de Champion',
    'coaching.viewProfile': 'Voir le profil',
    'coaching.deletePost': 'Supprimer l\'annonce',
    'coaching.contactCoach': 'Contacter le Coach',
    'coaching.contactStudent': 'Contacter l\'Étudiant',
    'coaching.postType': 'Type d\'Annonce',
    'coaching.offering': 'Offre de Coaching',
    'coaching.seeking': 'Recherche de Coaching',
    'coaching.detailsPlaceholder': 'Décrivez votre approche de coaching, votre expérience, ou ce que vous souhaitez améliorer...',
    'coaching.createSuccess': 'Annonce de coaching créée avec succès !',
    'coaching.createError': 'Échec de la création de l\'annonce de coaching',
    'coaching.deleteSuccess': 'Annonce de coaching supprimée avec succès !',
    'coaching.deleteError': 'Échec de la suppression de l\'annonce de coaching',
    
    // Footer
    'footer.tagline': 'La plateforme ultime pour les joueurs de League of Legends pour trouver des coéquipiers et créer des communautés.',
    'footer.legal': 'Légal',
    'footer.privacyPolicy': 'Politique de confidentialité',
    'footer.termsOfService': "Conditions d'utilisation",
    'footer.cookiePolicy': 'Politique des cookies',
    'footer.about': 'À propos',
    'footer.disclaimer': "RiftEssence n'est pas approuvé par Riot Games et ne reflète pas les opinions de Riot Games ou de toute personne officiellement impliquée dans la production ou la gestion des propriétés de Riot Games. Riot Games et toutes les propriétés associées sont des marques commerciales ou des marques déposées de Riot Games, Inc.",
    'footer.copyright': '© {year} RiftEssence. Tous droits réservés.',
    
    // Feedback Modal
    'feedback.title': 'Donner un avis',
    'feedback.giveFeedbackFor': 'Donner un avis pour {username}',
    'feedback.skill': 'Compétence (Étoiles)',
    'feedback.personality': 'Personnalité (Lunes)',
    'feedback.commentary': 'Commentaire (Facultatif)',
    'feedback.shareExperience': 'Partagez votre expérience...',
    'feedback.errorMinRating': 'Veuillez évaluer la compétence et la personnalité (au moins 1 étoile et 1 lune).',
    'feedback.submit': 'Soumettre',
    
    // Report Modal
    'report.title': 'Signaler un utilisateur',
    'report.reportUser': 'Signaler {username}',
    'report.reason': 'Raison',
    'report.selectReason': 'Sélectionnez une raison',
    'report.harassment': 'Harcèlement',
    'report.spam': 'Spam',
    'report.inappropriate': 'Contenu inapproprié',
    'report.cheating': 'Triche/Boosting',
    'report.other': 'Autre',
    'report.details': 'Détails',
    'report.provideDetails': 'Fournissez des détails supplémentaires...',
    'report.submit': 'Envoyer le signalement',
    'report.submitting': 'Envoi...',
    
    // Notifications
    'notifications.title': 'Notifications',
    'notifications.markAllRead': 'Tout marquer comme lu',
    'notifications.noNotifications': 'Aucune notification',
    'notifications.justNow': 'À l\'instant',
    'notifications.minutesAgo': 'Il y a {minutes}m',
    'notifications.hoursAgo': 'Il y a {hours}h',
    'notifications.daysAgo': 'Il y a {days}j',
    
    // Legal - Common
    'legal.backToHome': "Retour à l'accueil",
    'legal.lastUpdated': 'Dernière mise à jour : {date}',
    'legal.contactUs': 'Nous contacter',
    'legal.contactUsDescription': 'Si vous avez des questions sur cette Politique de confidentialité, veuillez nous contacter via nos canaux d\'assistance.',
    
    // Privacy Policy
    'privacy.title': 'Politique de confidentialité',
    'privacy.section1Title': '1. Informations que nous collectons',
    'privacy.section1Description': 'Nous collectons les informations suivantes :',
    'privacy.section1Item1': 'Informations de compte : nom d\'utilisateur, email, mot de passe (haché)',
    'privacy.section1Item2': 'Données de profil : bio, préférences de rôle et de style de jeu',
    'privacy.section1Item3': 'Données Riot Games : informations de compte LoL, historiques de matchs, rangs (lorsque vous liez votre compte Riot)',
    'privacy.section1Item4': 'Informations d\'utilisation : activité sur la plateforme, logs, adresse IP',
    'privacy.section1Item5': 'Informations de communication : contenu des publications, messages et commentaires',
    'privacy.section2Title': '2. Comment nous utilisons vos informations',
    'privacy.section2Description': 'Nous utilisons vos données pour :',
    'privacy.section2Item1': 'Fournir et maintenir notre service',
    'privacy.section2Item2': 'Vous connecter avec d\'autres joueurs de League of Legends',
    'privacy.section2Item3': 'Vérifier la propriété de votre compte Riot Games',
    'privacy.section2Item4': 'Afficher votre profil et votre historique de matchs aux autres utilisateurs',
    'privacy.section2Item5': 'Vous envoyer des notifications et des mises à jour sur votre compte',
    'privacy.section2Item6': 'Protéger contre la fraude et les abus',
    'privacy.section3Title': '3. Partage d\'informations',
    'privacy.section3Description': 'Nous ne vendons pas vos informations personnelles. Nous pouvons partager vos informations :',
    'privacy.section3Item1': 'Avec d\'autres utilisateurs dans le cadre de votre profil public',
    'privacy.section3Item2': 'Avec des prestataires de services qui nous aident à exploiter notre plateforme',
    'privacy.section3Item3': 'Lorsque requis par la loi ou pour protéger nos droits',
    'privacy.section4Title': '4. Sécurité des données',
    'privacy.section4Description': 'Nous mettons en œuvre des mesures de sécurité raisonnables pour protéger vos informations. Cependant, aucune méthode de transmission sur Internet n\'est sécurisée à 100%.',
    'privacy.section5Title': '5. Vos droits',
    'privacy.section5Description': 'Vous avez le droit de :',
    'privacy.section5Item1': 'Accéder et mettre à jour vos informations personnelles',
    'privacy.section5Item2': 'Supprimer votre compte et les données associées',
    'privacy.section5Item3': 'Refuser certaines communications',
    'privacy.section5Item4': 'Demander une copie de vos données',
    'privacy.section6Title': '6. Cookies et suivi',
    'privacy.section6Description': 'Nous utilisons des cookies et des technologies similaires pour maintenir votre session et améliorer votre expérience. Consultez notre Politique de cookies pour plus de détails.',
    'privacy.section7Title': '7. Services tiers',
    'privacy.section7Description': 'Nous nous intégrons à l\'API Riot Games pour vérifier les comptes et afficher les données de match. Nous utilisons également Discord pour l\'authentification OAuth. Ces services ont leurs propres politiques de confidentialité.',
    'privacy.section8Title': '8. Modifications de cette politique',
    'privacy.section8Description': 'Nous pouvons mettre à jour cette politique de confidentialité de temps en temps. Nous vous informerons de tout changement en publiant la nouvelle politique de confidentialité sur cette page et en mettant à jour la date "Dernière mise à jour".',
    
    // Terms of Service
    'terms.title': 'Conditions d\'utilisation',
    'terms.section1Title': '1. Acceptation des conditions',
    'terms.section1Description': 'En accédant et en utilisant RiftEssence, vous acceptez et acceptez d\'être lié par les termes et dispositions de cet accord. Si vous n\'acceptez pas ces conditions d\'utilisation, veuillez ne pas utiliser notre plateforme.',
    'terms.section2Title': '2. Licence d\'utilisation',
    'terms.section2Description': 'L\'autorisation d\'accéder temporairement à RiftEssence est accordée pour un usage personnel et non commercial uniquement. Il s\'agit de l\'octroi d\'une licence, et non d\'un transfert de propriété. En vertu de cette licence, vous ne pouvez pas :',
    'terms.section2Item1': 'Modifier ou copier les matériaux',
    'terms.section2Item2': 'Utiliser les matériaux à des fins commerciales',
    'terms.section2Item3': 'Tenter de décompiler ou d\'effectuer une ingénierie inverse de tout logiciel',
    'terms.section2Item4': 'Supprimer tout copyright ou mention de propriété',
    'terms.section2Item5': 'Transférer les matériaux à une autre personne',
    'terms.section3Title': '3. Comptes utilisateur',
    'terms.section3Description1': 'Lorsque vous créez un compte chez nous, vous devez fournir des informations exactes, complètes et actuelles. Ne pas le faire constitue une violation des conditions.',
    'terms.section3Description2': 'Vous êtes responsable de :',
    'terms.section3Item1': 'Protéger votre mot de passe',
    'terms.section3Item2': 'Toutes les activités ou actions sous votre compte',
    'terms.section3Item3': 'Nous informer immédiatement de toute utilisation non autorisée',
    'terms.section4Title': '4. Contenu utilisateur',
    'terms.section4Description1': 'Lorsque vous créez un compte chez nous, vous devez fournir des informations exactes, complètes et actuelles. Ne pas le faire constitue une violation des conditions.',
    'terms.section4Description2': 'Vous acceptez de ne pas publier de contenu qui :',
    'terms.section4Item1': 'Est illégal, nuisible ou abusif',
    'terms.section4Item2': 'Viole les droits d\'un tiers',
    'terms.section4Item3': 'Contient des logiciels malveillants ou du code malveillant',
    'terms.section4Item4': 'Est du spam ou de la publicité non sollicitée',
    'terms.section4Item5': 'Usurpe l\'identité d\'une autre personne ou entité',
    'terms.section5Title': '5. Activités interdites',
    'terms.section5Description': 'Vous ne pouvez pas :',
    'terms.section5Item1': 'Utiliser la plateforme à des fins illégales',
    'terms.section5Item2': 'Harceler, abuser ou nuire à d\'autres utilisateurs',
    'terms.section5Item3': 'Créer plusieurs comptes pour manipuler les évaluations',
    'terms.section5Item4': 'Utiliser des outils automatisés (bots) sans autorisation',
    'terms.section5Item5': 'Tenter d\'obtenir un accès non autorisé à nos systèmes',
    'terms.section5Item6': 'Interférer avec le bon fonctionnement de la plateforme',
    'terms.section6Title': '6. Avertissement concernant Riot Games',
    'terms.section6Description1': 'RiftEssence a été créé dans le cadre de la politique "Legal Jibber Jabber" de Riot Games en utilisant des actifs appartenant à Riot Games. Riot Games n\'approuve ni ne parraine ce projet.',
    'terms.section6Description2': 'RiftEssence n\'est pas approuvé par Riot Games et ne reflète pas les opinions de Riot Games ou de toute personne officiellement impliquée dans la production ou la gestion des propriétés de Riot Games. Riot Games et toutes les propriétés associées sont des marques commerciales ou des marques déposées de Riot Games, Inc.',
    'terms.section7Title': '7. Résiliation',
    'terms.section7Description1': 'Nous pouvons résilier ou suspendre votre compte et votre accès à la plateforme immédiatement, sans préavis ni responsabilité, pour quelque raison que ce soit, y compris une violation de ces conditions.',
    'terms.section7Description2': 'En cas de résiliation, votre droit d\'utiliser la plateforme cessera immédiatement.',
    'terms.section8Title': '8. Exclusion de garanties',
    'terms.section8Description': 'La plateforme est fournie "telle quelle" sans garanties d\'aucune sorte, expresses ou implicites. Nous ne garantissons pas que la plateforme sera ininterrompue, sécurisée ou sans erreur.',
    'terms.section9Title': '9. Limitation de responsabilité',
    'terms.section9Description': 'En aucun cas RiftEssence ou ses fournisseurs ne seront responsables de tout dommage découlant de l\'utilisation ou de l\'impossibilité d\'utiliser la plateforme.',
    'terms.section10Title': '10. Modifications des conditions',
    'terms.section10Description': 'Nous nous réservons le droit de modifier ces conditions à tout moment. Nous vous informerons de tout changement en publiant les nouvelles conditions sur cette page et en mettant à jour la date "Dernière mise à jour".',
    
    // Cookie Policy
    'cookies.title': 'Politique de cookies',
    'cookies.section1Title': '1. Que sont les cookies',
    'cookies.section1Description': 'Les cookies sont de petits fichiers texte stockés sur votre appareil lorsque vous visitez notre site web. Ils nous aident à vous offrir une meilleure expérience en mémorisant vos préférences et en comprenant comment vous utilisez notre plateforme.',
    'cookies.section2Title': '2. Comment nous utilisons les cookies',
    'cookies.section2Description': 'Nous utilisons des cookies aux fins suivantes :',
    'cookies.section2Item1': 'Cookies essentiels : Requis pour que la plateforme fonctionne correctement, y compris l\'authentification et la gestion de session',
    'cookies.section2Item2': 'Cookies de préférence : Mémorisent vos paramètres et préférences (par exemple, sélection du thème)',
    'cookies.section2Item3': 'Cookies d\'analyse : Nous aident à comprendre comment les utilisateurs interagissent avec notre plateforme (si implémenté)',
    'cookies.section3Title': '3. Types de cookies que nous utilisons',
    'cookies.section3Subtitle1': 'Cookies de session',
    'cookies.section3Description1': 'Ce sont des cookies temporaires qui expirent lorsque vous fermez votre navigateur. Nous les utilisons pour :',
    'cookies.section3Item1a': 'Maintenir votre session de connexion',
    'cookies.section3Item1b': 'Mémoriser vos actions au cours d\'une session de navigation',
    'cookies.section3Subtitle2': 'Cookies persistants',
    'cookies.section3Description2': 'Ces cookies restent sur votre appareil pendant une période définie. Nous les utilisons pour :',
    'cookies.section3Item2a': 'Mémoriser votre statut de connexion',
    'cookies.section3Item2b': 'Enregistrer vos préférences de thème',
    'cookies.section3Item2c': 'Améliorer votre expérience lors de visites futures',
    'cookies.section4Title': '4. Stockage local',
    'cookies.section4Description': 'En plus des cookies, nous utilisons le stockage local du navigateur pour :',
    'cookies.section4Item1': 'Stocker votre jeton d\'authentification JWT',
    'cookies.section4Item2': 'Mettre en cache vos préférences utilisateur',
    'cookies.section4Item3': 'Enregistrer votre sélection de thème',
    'cookies.section4Item4': 'Maintenir l\'état de l\'application entre les sessions',
    'cookies.section4Note': 'Les données de stockage local persistent jusqu\'à ce que vous effaciez les données de votre navigateur ou que vous vous déconnectiez.',
    'cookies.section5Title': '5. Cookies tiers',
    'cookies.section5Description': 'Nous utilisons les services tiers suivants qui peuvent définir des cookies :',
    'cookies.section5Item1': 'Cloudflare Turnstile : Pour la protection contre les bots et la prévention du spam',
    'cookies.section5Item2': 'OAuth Discord : Lorsque vous vous authentifiez en utilisant Discord',
    'cookies.section5Note': 'Ces services tiers ont leurs propres politiques de confidentialité et de cookies.',
    'cookies.section6Title': '6. Gestion des cookies',
    'cookies.section6Description': 'Vous pouvez contrôler et gérer les cookies de plusieurs façons :',
    'cookies.section6Item1': 'Paramètres du navigateur : La plupart des navigateurs vous permettent de refuser ou de supprimer les cookies. Consultez la documentation d\'aide de votre navigateur pour obtenir des instructions.',
    'cookies.section6Item2': 'Désactivation : Vous pouvez désactiver les cookies non essentiels via les paramètres de votre navigateur.',
    'cookies.section6Note': 'Veuillez noter que la désactivation des cookies essentiels peut affecter votre capacité à utiliser certaines fonctionnalités de notre plateforme, y compris la connexion et le maintien de votre session.',
    'cookies.section7Title': '7. Rétention des cookies',
    'cookies.section7Description': 'Différents cookies ont différentes périodes de rétention :',
    'cookies.section7Item1': 'Cookies de session : Supprimés lorsque vous fermez votre navigateur',
    'cookies.section7Item2': 'Jetons d\'authentification : Expirent généralement après 7 jours',
    'cookies.section7Item3': 'Cookies de préférence : Persistent jusqu\'à ce que vous les supprimiez ou changiez vos préférences',
    'cookies.section8Title': '8. Mises à jour de cette politique',
    'cookies.section8Description': 'Nous pouvons mettre à jour cette politique de cookies de temps en temps pour refléter des changements dans nos pratiques ou pour d\'autres raisons opérationnelles, légales ou réglementaires.',
    'cookies.section9Description1': 'Si vous avez des questions concernant notre utilisation des cookies, veuillez nous contacter via nos canaux d\'assistance.',
    'cookies.section9Description2': 'Pour plus d\'informations sur la façon dont nous traitons vos données personnelles, veuillez consulter notre politique de confidentialité.',
    
    // Profile
    'profile.editProfile': 'Modifier le profil',
    'profile.saveChanges': '💾 Sauvegarder',
    'profile.saving': '⏳ Sauvegarde...',
    'profile.refreshStats': 'Actualiser les stats',
    'profile.giveFeedback': 'Donner un avis',
    'profile.report': 'Signaler',
    'profile.block': 'Bloquer',
    'profile.unblock': 'Débloquer',
    'profile.blocked': 'Bloqué',
    'profile.bio': 'Bio',
    'profile.playstyles': 'Styles de jeu',
    'profile.selectUpTo2Playstyles': 'Sélectionnez jusqu\'à 2 styles de jeu :',
    'profile.noPlaystyles': 'Aucun style de jeu sélectionné',
    'profile.languages': 'Langues',
    'profile.selectLanguages': 'Sélectionnez les langues que vous parlez :',
    'profile.noLanguages': 'Aucune langue sélectionnée',
    'profile.voiceChat': 'Chat vocal',
    'profile.championPool': 'Pool de champions',
    'profile.riotAccounts': 'Comptes Riot',
    'profile.linkedRiotAccounts': 'Comptes Riot liés',
    'profile.mainAccount': 'Compte principal',
    'profile.hidden': 'Masqué',
    'profile.verified': 'Vérifié',
    'profile.winrate': 'Taux de victoire',
    'profile.gamesPerDay': 'Parties/Jour',
    'profile.gamesPerWeek': 'Parties/Semaine',
    'profile.lastPlayed': 'Dernière partie',
    'profile.setAsMain': 'Définir comme principal',
    'profile.show': 'Afficher',
    'profile.hide': 'Masquer',
    'profile.removeAccount': 'Supprimer le compte',
    'profile.noRiotAccounts': 'Aucun compte Riot lié',
    'profile.addRiotAccount': 'Ajouter un compte Riot',
    'profile.discord': 'Discord',
    'profile.discordAccount': 'Compte Discord',
    'profile.discordLinked': 'Discord lié',
    'profile.notLinked': 'Non lié',
    'profile.unlink': 'Délier',
    'profile.noDiscordAccount': 'Aucun compte Discord lié',
    'profile.bestRank': 'Meilleur Rang :',
    'profile.usernamePlaceholder': 'Nom d\'utilisateur',
    'profile.save.usernameSuccess': 'Nom d\'utilisateur mis à jour ! ✨',
    'profile.save.usernameError': 'Échec de l\'enregistrement du nom d\'utilisateur : {error}',
    'profile.save.languagesSuccess': 'Langues mises à jour !',
    'profile.save.languagesError': 'Échec de l\'enregistrement des langues : {error}',
    'profile.save.playstylesSuccess': 'Styles de jeu mis à jour !',
    'profile.save.playstylesError': 'Échec de l\'enregistrement des styles de jeu : {error}',
    'profile.save.maxPlaystyles': 'Vous ne pouvez sélectionner que jusqu\'à 2 styles de jeu',
    'profile.champion.invalid': 'Champion(s) invalide(s) : {champs}',
    'profile.loading': 'Chargement du profil...',
    'profile.role.top': 'Haut',
    'profile.role.jungle': 'Jungle',
    'profile.role.middle': 'Milieu',
    'profile.role.bottom': 'Bas',
    'profile.role.support': 'Support',
    'profile.mostPlayedRole': 'Rôle le plus joué :',
    'profile.status': 'Statut',
    'profile.status.flagged': 'Signalé',
    'profile.status.reports': '{count} signalement(s)',
    'profile.champion.search': 'Rechercher un champion...',
    'profile.champion.tier': 'Rang {tier}',
    'profile.mostPlayedRoles': 'Rôle(s) le(s) plus joué(s) :',
    'profile.acrossAccounts': 'Sur tous les comptes liés',
    'profile.ratings.skill': 'Compétence ({count} avis)',
    'profile.ratings.personality': 'Personnalité ({count} avis)',
    'common.add': 'Ajouter',
    'common.language.english': 'Anglais',
    'common.language.french': 'Français',
    'common.language.spanish': 'Espagnol',
    'common.language.german': 'Allemand',
    'common.language.italian': 'Italien',
    'common.language.portuguese': 'Portugais',
    'common.language.polish': 'Polonais',
    'common.language.russian': 'Russe',
    'common.language.turkish': 'Turc',
    'common.language.korean': 'Coréen',
    'common.language.japanese': 'Japonais',
    'common.language.chinese': 'Chinois',
    'playstyle.controlledchaos': 'Chaos contrôlé',
    'playstyle.fundamentals': 'Fondamentaux',
    'playstyle.coinflips': 'Pile ou Face',
    'playstyle.scaling': 'Scaling',
    'playstyle.snowball': 'Snowball',
    'profile.badge.developer.desc': 'Contournement des délais',
    'profile.badge.support.desc': 'Membre de l\'équipe support',
    'profile.badge.earlysupporter.desc': 'Rejoint pendant la bêta',
    'profile.badge.vip.desc': 'Membre VIP',
    'profile.badge.admin.desc': 'Administrateur du site',
    'profile.badge.beta.desc': 'Utilisateur précoce',
    'profile.badge.verified.desc': 'Identité vérifiée',
    'profile.badge.partner.desc': 'Partenaire officiel',
    'profile.badge.mvp.desc': 'Joueur le plus précieux',
    'profile.badge.goat.desc': 'Le meilleur de tous les temps',
    'profile.winrateSuffix': '% Victoires',
    'profile.communities': 'Communautés',
    'profile.clickToViewCommunity': 'Cliquez pour voir la page de la communauté',
    'profile.noCommunities': 'Aucune communauté pour le moment',
    'profile.feedback': 'Avis',
    'profile.stars': 'Étoiles',
    'profile.moons': 'Lunes',
    'profile.noFeedback': 'Aucun avis pour le moment',
    
    // Settings
    'settings.title': 'Paramètres du compte',
    'settings.language.title': 'Langue',
    'settings.language.description': "Sélectionnez votre langue préférée pour l'interface utilisateur.",
    'settings.theme.title': 'Thème',
    'settings.theme.description': "Choisissez votre thème de couleurs préféré pour l'application.",
    'settings.account.title': 'Informations du compte',
    'settings.account.username': "Nom d'utilisateur",
    'settings.account.email': 'Email',
    'settings.account.status': 'Statut du compte',
    'settings.account.verified': '✓ Vérifié',
    'settings.account.notVerified': 'Non vérifié',
    'settings.password.title': 'Mot de passe',
    'settings.password.description': 'Définissez un mot de passe pour activer la connexion par mot de passe. Cela vous permet de vous connecter sans lier un compte Riot.',
    'settings.password.new': 'Nouveau mot de passe',
    'settings.password.confirm': 'Confirmer le nouveau mot de passe',
    'settings.password.set': 'Définir le mot de passe',
    'settings.password.setting': 'Enregistrement...',
    'settings.password.success': 'Mot de passe défini avec succès ! Vous pouvez maintenant vous connecter avec votre mot de passe.',
    'settings.password.error.match': 'Les mots de passe ne correspondent pas',
    'settings.password.error.length': 'Le mot de passe doit contenir au moins 6 caractères',
    'settings.password.error.network': 'Erreur réseau',
    'settings.riot.title': 'Compte Riot',
    'settings.riot.description': 'Liez votre compte Riot pour vérifier votre rang et accéder à des fonctionnalités supplémentaires.',
    'settings.riot.manage': 'Gérer les comptes Riot',
    
    // Theme names
    'theme.classic': 'Sombre classique',
    'theme.arcanePastel': 'Pastel Arcane',
    'theme.nightshade': 'Belladone',
    'theme.infernalEmber': 'Braise infernale',
    'theme.radiantLight': 'Lumière radieuse',
    'theme.oceanDepths': 'Abysses Océaniques',
    'theme.forestMystic': 'Forêt Mystique',
    'theme.sunsetBlaze': 'Brasier du Couchant',
    'theme.shadowAssassin': 'Assassin des Ombres',
    'theme.clickToApply': 'Cliquer pour appliquer',
    
    // NoAccess Component
    'noAccess.profileRequired': 'Accès au profil requis',
    'noAccess.profileRequiredDesc': 'Vous devez être connecté pour voir les profils. Connectez-vous pour accéder aux profils des joueurs et rejoindre la communauté League of Legends.',
    'noAccess.createPostRequired': 'Connectez-vous pour créer des annonces',
    'noAccess.createPostRequiredDesc': 'Créez un compte ou connectez-vous pour partager des annonces, vous connecter avec d\'autres joueurs et rejoindre la conversation.',
    'noAccess.findPlayersRequired': 'Connectez-vous pour trouver des joueurs',
    'noAccess.findPlayersRequiredDesc': 'Créez un compte ou connectez-vous pour parcourir les profils des joueurs, trouver des coéquipiers et construire votre équipe de rêve.',
    'noAccess.findTeamRequired': 'Connectez-vous pour trouver des équipes',
    'noAccess.findTeamRequiredDesc': 'Créez un compte ou connectez-vous pour découvrir des communautés, rejoindre des équipes et rivaliser ensemble.',
    'noAccess.goHome': 'Retour à l\'accueil',
    'noAccess.close': 'Fermer',
    'noAccess.signIn': 'Se connecter',
    'noAccess.createAccount': 'Créer un compte',
    
    // Bug Report Component
    'bug.pleaseDescribe': 'Veuillez décrire le bug',
    'bug.submitSuccess': 'Rapport de bug soumis ! Merci !',
    'bug.submitError': 'Échec de l\'envoi du rapport de bug. Veuillez réessayer.',
    'bug.descriptionPlaceholder': 'Quel bug ou erreur avez-vous rencontré ?',
    'bug.reportBug': 'Signaler un bug',
    'bug.reportButton': '🐛 Signaler un bug',
    
    // Navbar
    'navbar.searchPlaceholder': 'Rechercher des invocateurs...',
    'navbar.noResults': 'Aucun résultat trouvé',
    'navbar.searching': 'Recherche...',
    
    // Onboarding Wizard
    'onboarding.linkRiotRequired': 'Veuillez lier votre compte Riot pour continuer',
    'onboarding.themeClassic': 'Classique',
    'onboarding.themeClassicDesc': 'Épuré et intemporel',
    'onboarding.themeInfernalEmber': 'Braise infernale',
    'onboarding.themeInfernalEmberDesc': 'Ardent et intense',
    'onboarding.themeArcanePastel': 'Pastel Arcane',
    'onboarding.themeArcanePastelDesc': 'Doux et magique',
    'onboarding.themeNightshade': 'Belladone',
    'onboarding.themeNightshadeDesc': 'Sombre et mystérieux',
    'onboarding.themeRadiantLight': 'Lumière radieuse',
    'onboarding.themeRadiantLightDesc': 'Lumineux et inspirant',
    
    // Report Modal (additional)
    'report.reasonRequired': 'Veuillez fournir une raison pour le signalement.',
    'report.reasonLabel': 'Raison du signalement',
    'report.detailsPlaceholder': 'Décrivez pourquoi vous signalez cet utilisateur...',
    
    // Admin
    'admin.broadcastTitle': 'Diffuser un Message Système',
    'admin.broadcastDescription': 'Envoyer un message de "Système" à tous les utilisateurs',
    'admin.broadcastPlaceholder': 'Entrez votre message système ici...',
    'admin.broadcastCharCount': 'caractères',
    'admin.broadcastPreview': 'Aperçu du Message',
    'admin.broadcastSendButton': 'Envoyer à Tous',
    'admin.broadcastConfirm': 'Êtes-vous sûr de vouloir envoyer ce message à TOUS les utilisateurs ? Cette action est irréversible.',
    'admin.broadcastSuccess': 'Message envoyé avec succès à tous les utilisateurs !',
    'admin.broadcastStats': 'Utilisateurs : {users}, Conversations : {convos}, Messages : {msgs}',
    'admin.broadcastTooShort': 'Le message doit contenir au moins 10 caractères',
    'admin.broadcastTooLong': 'Le message dépasse la limite de 2000 caractères',
    
    // Matchups
    'matchups.title': 'Matchups',
    'matchups.myLibrary': 'Ma Bibliothèque',
    'matchups.createNew': 'Créer un Matchup',
    'matchups.searchPlaceholder': 'Rechercher par champion...',
    'matchups.noMatchups': 'Aucun matchup. Créez votre premier guide!',
    'matchups.myChampion': 'Mon Champion',
    'matchups.enemyChampion': 'Champion Ennemi',
    'matchups.role': 'Rôle',
    'matchups.difficulty': 'Difficulté',
    'matchups.laningPhase': 'Phase de Lane',
    'matchups.teamFights': 'Combats d\'Équipe',
    'matchups.items': 'Objets & Runes',
    'matchups.powerSpikes': 'Pics de Puissance',
    'matchups.public': 'Public',
    'matchups.private': 'Privé',
    'matchups.likes': 'J\'aime',
    'matchups.downloads': 'Téléchargements',
    'matchups.edit': 'Modifier',
    'matchups.delete': 'Supprimer',
    'matchups.confirmDelete': 'Voulez-vous vraiment supprimer ce matchup?',
    'matchups.deleted': 'Matchup supprimé avec succès',
    'matchups.create': 'Créer un Matchup',
    'matchups.editMatchup': 'Modifier Matchup',
    'matchups.save': 'Enregistrer',
    'matchups.update': 'Mettre à Jour',
    'matchups.cancel': 'Annuler',
    'matchups.makePublic': 'Rendre ce matchup public',
    'matchups.titleLabel': 'Titre',
    'matchups.titlePlaceholder': 'ex: Darius vs Teemo - Guide Complet',
    'matchups.descriptionLabel': 'Description',
    'matchups.descriptionPlaceholder': 'Brève description pour le marché',
    'matchups.marketplace': 'Marché',
    'matchups.browsePublic': 'Parcourir le Marché',
    'matchups.search': 'Rechercher par champion...',
    'matchups.sortBy': 'Trier Par',
    'matchups.newest': 'Plus Récents',
    'matchups.mostLiked': 'Plus Aimés',
    'matchups.mostDownloaded': 'Plus Téléchargés',
    'matchups.download': 'Télécharger',
    'matchups.downloaded': 'Téléchargé avec succès',
    'matchups.addToLibrary': 'Ajouter à la Bibliothèque',
    'matchups.addedToLibrary': 'Ajouté à votre bibliothèque',
    'matchups.removeFromLibrary': 'Retirer de la Bibliothèque',
    'matchups.removedFromLibrary': 'Retiré de votre bibliothèque',
    'matchups.like': 'J\'aime',
    'matchups.dislike': 'Je n\'aime pas',
    'matchups.author': 'Auteur',
    'matchups.viewDetails': 'Voir Détails',
    'matchups.togglePublic': 'Basculer Public',
    'matchups.toggledPublic': 'Visibilité du matchup mise à jour',
    'matchups.noPublicMatchups': 'Aucun matchup public trouvé. Soyez le premier à partager!',
    'matchups.created': 'Matchup créé avec succès',
    'matchups.updated': 'Matchup mis à jour avec succès',
    'matchups.laningNotesPlaceholder': 'Comment jouer le début de partie, gestion des vagues, patterns d\'échanges...',
    'matchups.teamfightNotesPlaceholder': 'Positionnement, cibles prioritaires, combos...',
    'matchups.itemNotesPlaceholder': 'Objets essentiels, builds situationnels, runes...',
    'matchups.spikeNotesPlaceholder': 'Niveau 2, 6, seuils d\'objets...',
    'matchups.charactersRemaining': 'caractères restants',
    'matchups.fieldsRequired': 'Rôle, Mon Champion et Champion Ennemi sont requis',
    'matchups.titleRequired': 'Le titre est requis pour les matchups publics',
    'matchups.difficulty.free_win': 'Victoire Facile',
    'matchups.difficulty.very_favorable': 'Très Favorable',
    'matchups.difficulty.favorable': 'Favorable',
    'matchups.difficulty.skill_matchup': 'Matchup Skill',
    'matchups.difficulty.hard': 'Difficile',
    'matchups.difficulty.very_hard': 'Très Difficile',
    'matchups.difficulty.free_lose': 'Défaite Assurée',
    'common.loadMore': 'Charger Plus',
  },
};
