import { describe, it, expect } from 'vitest'
import { getSkillScores, getPlayerType, type QuestionnaireAnswers } from '../pages/utils/getSkillsScore'

describe('getSkillScores', () => {
    it('returns all 7 skill categories', () => {
        const answers: QuestionnaireAnswers = {
            time_frame: '1-3 years',
            learning_style: ['I can follow guitar tabs'],
            technical_skills: ['Open chords', 'Barre chords'],
            switching_chords: 'Comfortable at moderate tempos',
            song_playing: 'Yes, at slower tempos',
            techniques: { 'Bends': 3, 'Vibrato': 2 },
            soloing: 'I know a few licks or riffs',
            practicing: '30 minutes',
            goal: 'Playing songs for fun'
        }

        const scores = getSkillScores(answers)

        expect(scores).toHaveLength(7)
        expect(scores.map(s => s.axis)).toEqual([
            'Technical Skill',
            'Chord Fluency',
            'Experience',
            'Rhythm & Feel',
            'Theory',
            'Goal Orientation',
            'Lead & Soloing'
        ])
    })

    it('returns values between 0 and 1', () => {
        const answers: QuestionnaireAnswers = {
            time_frame: '3+ years',
            learning_style: ['I can read standard notation'],
            technical_skills: ['Open chords', 'Barre chords', 'Power chords', 'Fingerpicking patterns', 'Basic strumming patterns'],
            switching_chords: 'Very Comfortable at fast tempos',
            song_playing: 'Yes, confidently',
            techniques: { 'Bends': 5, 'Vibrato': 5, 'Palm muting': 5 },
            soloing: 'I can improvise over a chord progression',
            practicing: 'More than 1 hour',
            goal: 'Becoming an advanced player'
        }

        const scores = getSkillScores(answers)

        scores.forEach(score => {
            expect(score.value).toBeGreaterThanOrEqual(0)
            expect(score.value).toBeLessThanOrEqual(1)
        })
    })

    it('handles minimal data gracefully', () => {
        const answers: QuestionnaireAnswers = {
            time_frame: 'Less than 6 months',
            learning_style: ['I learn by ear / watching videos'],
            technical_skills: ['Open chords'],
            switching_chords: 'Still learning',
            song_playing: 'Not yet',
            techniques: { 'Bends': 1 },
            soloing: "I haven't tried it",
            practicing: '15 minutes',
            goal: 'Just starting out'
        }

        const scores = getSkillScores(answers)

        expect(scores).toHaveLength(7)
        scores.forEach(score => {
            expect(score.value).toBeGreaterThanOrEqual(0)
            expect(score.value).toBeLessThanOrEqual(1)
        })
    })
})

describe('getPlayerType', () => {
    it('returns "Just Starting Out" for beginners', () => {
        const answers: QuestionnaireAnswers = {
            time_frame: 'Less than 6 months',
            learning_style: [],
            technical_skills: [],
            switching_chords: 'Still learning',
            song_playing: 'Not yet',
            techniques: {},
            soloing: "I haven't tried it",
            practicing: '15 minutes',
            goal: 'Just starting out'
        }

        expect(getPlayerType(answers)).toBe('Just Starting Out')
    })

    it('returns "Performing Musician" for advanced players', () => {
        const answers: QuestionnaireAnswers = {
            time_frame: '3+ years',
            learning_style: ['I can read standard notation'],
            technical_skills: ['Open chords', 'Barre chords', 'Power chords'],
            switching_chords: 'Very Comfortable at fast tempos',
            song_playing: 'Yes, confidently',
            techniques: { 'Bends': 5, 'Vibrato': 5 },
            soloing: 'I can improvise over a chord progression',
            practicing: 'More than 1 hour',
            goal: 'Performing or recording'
        }

        expect(getPlayerType(answers)).toBe('Performing Musician')
    })
})
