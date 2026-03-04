
export interface QuestionnaireAnswers {
    time_frame: string
    learning_style : string[]
    technical_skills: string[]
    switching_chords: string
    song_playing: string
    techniques: Record<string, number>   // e.g. { "Bends": 3, "Vibrato": 2 }
    soloing: string
    practicing: string
    goal: string
}

export interface SkillScore {
    axis: string
    value: number   // 0–1
}

// ─── Individual scorers ───────────────────────────────────────────────────────

function scoreTechnicalSkill(answers: QuestionnaireAnswers): number {
    const { technical_skills, techniques } = answers

    // technical_skills: each selection = 0.2 (5 options → max 1.0)
    const chordScore = (technical_skills?.length ?? 0) / 5

    // techniques: average of all 1–5 ratings normalized to 0–1
    const techValues = techniques ? Object.values(techniques) : []
    const techAvg = techValues.length
        ? techValues.reduce((a, b) => a + b, 0) / techValues.length / 5
        : 0

    // weighted: chord selection 40%, technique ratings 60%
    return chordScore * 0.4 + techAvg * 0.6
}

function scoreChordFluency(answers: QuestionnaireAnswers): number {
    const switchMap: Record<string, number> = {
        'Very Comfortable at fast tempos':  1.0,
        'Comfortable at moderate tempos':   0.67,
        'Okay at slow tempos':              0.33,
        'Still learning':                   0.1,
    }

    const songMap: Record<string, number> = {
        'Yes, confidently':           1.0,
        'Yes, at slower tempos':      0.67,
        'With pauses or mistakes':    0.33,
        'Not yet':                    0.05,
    }

    const switchScore = switchMap[answers.switching_chords] ?? 0
    const songScore   = songMap[answers.song_playing] ?? 0

    // weighted equally — both measure real-world execution
    return switchScore * 0.5 + songScore * 0.5
}

function scoreExperience(answers: QuestionnaireAnswers): number {
    const timeMap: Record<string, number> = {
        '3+ years':               1.0,
        '1-3 years':              0.67,
        '6 months - 1 year':      0.4,
        'Less than 6 months':     0.15,
        'Never played before':    0,
    }

    const practiceMap: Record<string, number> = {
        'More than 1 hour':  1.0,
        '1 hour':            0.75,
        '30 minutes':        0.4,
        '15 minutes':        0.2,
    }

    const timeScore     = timeMap[answers.time_frame] ?? 0
    const practiceScore = practiceMap[answers.practicing] ?? 0

    // time played weighted more heavily than daily practice
    return timeScore * 0.65 + practiceScore * 0.35
}

function scoreRhythm(answers: QuestionnaireAnswers): number {
    const { techniques, technical_skills } = answers

    // rhythm-relevant techniques
    const rhythmTechs = ['Palm muting', 'Hammer-ons', 'Pull-offs', 'Slides']
    const rhythmValues = rhythmTechs.map(t => techniques?.[t] ?? 0)
    const rhythmTechScore =
        rhythmValues.reduce((a, b) => a + b, 0) / rhythmTechs.length / 5

    // fingerpicking selection signals rhythm sophistication
    const hasFingerpicking = technical_skills?.includes('Fingerpicking patterns') ? 1 : 0
    const hasStrumming     = technical_skills?.includes('Basic strumming patterns') ? 1 : 0
    const patternScore     = (hasFingerpicking * 0.6 + hasStrumming * 0.4)

    return rhythmTechScore * 0.6 + patternScore * 0.4
}

function scoreTheory(answers: QuestionnaireAnswers): number {
    // Returns 0 if the question hasn't been answered yet
    if (!answers.learning_style) return 0

    const theoryMap: Record<string, number> = {
        'I learn by ear / watching videos':                          0.1,
        'I can follow guitar tabs':                                  0.3,
        'I can read chord charts and understand keys/scales':        0.65,
        'I can read standard notation':                              1.0,
    }

    // Take the highest selected value rather than averaging
    // A student who can read notation can also read tabs — we want their ceiling
    const highest = answers.learning_style.reduce((max, selection) => {
        const val = theoryMap[selection] ?? 0
        return val > max ? val : max
    }, 0)

    // Bonus for breadth: selecting multiple options adds a small multiplier
    // e.g. selecting 3 options adds up to 10% on top of their ceiling score
    const breadthBonus = Math.min((answers.learning_style.length - 1) * 0.05, 0.1)

    return Math.min(highest + breadthBonus, 1.0)
}

function scoreGoalOrientation(answers: QuestionnaireAnswers): number {
    const goalMap: Record<string, number> = {
        'Just starting out':                  0.1,
        'Playing songs for fun':              0.35,
        'Playing confidently with others':    0.6,
        'Performing or recording':            0.85,
        'Becoming an advanced player':        1.0,
    }

    const practiceMap: Record<string, number> = {
        '15 minutes':        0.2,
        '30 minutes':        0.45,
        '1 hour':            0.75,
        'More than 1 hour':  1.0,
    }

    const goalScore     = goalMap[answers.goal] ?? 0
    const practiceScore = practiceMap[answers.practicing] ?? 0

    // goal weighted more — practice time just confirms commitment level
    return goalScore * 0.7 + practiceScore * 0.3
}

function scoreSoloing(answers: QuestionnaireAnswers) : number {
    const soloMap: Record<string, number> = {
        'I haven\'t tried it':                          0.1,
        'I know a few licks or riffs':                  0.35,
        'I can play solos from songs I\'ve learned':    0.7,
        'I can improvise over a chord progression':     1.0
    }

    return soloMap[answers.soloing] ?? 0
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function getPlayerType(answers: QuestionnaireAnswers) : string {
    const score = scoreGoalOrientation(answers)

    if (score >= 0.85) return 'Performing Musician'
    if (score >= 0.65) return 'Dedicated Player'
    if (score >= 0.45) return 'Active Learner'
    if (score >= 0.25) return 'Casual Player'
    return 'Just Starting Out'
}


export function getSkillScores(answers: QuestionnaireAnswers): SkillScore[] {
    return [
        { axis: 'Technical Skill',  value: scoreTechnicalSkill(answers) },
        { axis: 'Chord Fluency',    value: scoreChordFluency(answers) },
        { axis: 'Experience',       value: scoreExperience(answers) },
        { axis: 'Rhythm & Feel',    value: scoreRhythm(answers) },
        { axis: 'Theory',           value: scoreTheory(answers) },
        { axis: 'Goal Orientation', value: scoreGoalOrientation(answers) },
        { axis: 'Lead & Soloing',   value: scoreSoloing(answers)}
    ]
}

