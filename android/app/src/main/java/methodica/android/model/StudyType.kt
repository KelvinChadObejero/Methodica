package methodica.android.model

data class StudyType(
    val id: String,
    val name: String,
    val shortSummary: String,
    val explanation: String,
    val researchReference: String,
    val recommendedDurations: String,
    val starterBlocks: List<StudyBlock>
)

object SampleStudyTypes {
    val list = listOf(
        StudyType(
            id = "pomodoro",
            name = "Pomodoro Technique",
            shortSummary = "Classic 25-minute focus blocks paired with 5-minute restorative breaks.",
            explanation = "Reduces cognitive fatigue and prevents burnout by balancing intense focus bursts with mandatory short recovery intervals.",
            researchReference = "Cirillo, F. (2006). The Pomodoro Technique. FC Consulting.",
            recommendedDurations = "25 min focus / 5 min break (4 cycles followed by a 15 min long break)",
            starterBlocks = listOf(
                StudyBlock(title = "Pomodoro Sprint 1", durationMinutes = 25, type = BlockType.FOCUS),
                StudyBlock(title = "Short Break 1", durationMinutes = 5, type = BlockType.SHORT_BREAK),
                StudyBlock(title = "Pomodoro Sprint 2", durationMinutes = 25, type = BlockType.FOCUS),
                StudyBlock(title = "Short Break 2", durationMinutes = 5, type = BlockType.SHORT_BREAK),
                StudyBlock(title = "Pomodoro Sprint 3", durationMinutes = 25, type = BlockType.FOCUS),
                StudyBlock(title = "Long Break", durationMinutes = 15, type = BlockType.LONG_BREAK)
            )
        ),
        StudyType(
            id = "active-recall",
            name = "Active Recall & Testing",
            shortSummary = "Self-testing and retrieving information without looking at source notes.",
            explanation = "Forces the brain to reconstruct memory traces, significantly strengthening long-term memory retention compared to passive reading.",
            researchReference = "Karpicke, J. D., & Blunt, J. R. (2011). Retrieval practice produces more learning than elaborative studying. Science.",
            recommendedDurations = "30 min intensive study / 15 min active recall testing",
            starterBlocks = listOf(
                StudyBlock(title = "Topic Reading & Synthesis", durationMinutes = 30, type = BlockType.FOCUS),
                StudyBlock(title = "Active Memory Self-Test", durationMinutes = 15, type = BlockType.RECALL),
                StudyBlock(title = "Break & Hydration", durationMinutes = 5, type = BlockType.SHORT_BREAK)
            )
        ),
        StudyType(
            id = "feynman",
            name = "Feynman Technique",
            shortSummary = "Explain concepts in simple language as if teaching a beginner.",
            explanation = "Exposes gaps in understanding by eliminating jargon and forcing clear, intuitive mental models.",
            researchReference = "Feynman, R. P. (1985). Surely You're Joking, Mr. Feynman!",
            recommendedDurations = "20 min concept isolation / 15 min simplified teaching draft",
            starterBlocks = listOf(
                StudyBlock(title = "Isolate Target Concept", durationMinutes = 20, type = BlockType.FOCUS),
                StudyBlock(title = "Draft Simple Teaching Explanation", durationMinutes = 15, type = BlockType.RECALL),
                StudyBlock(title = "Refine & Bridge Understanding Gaps", durationMinutes = 15, type = BlockType.FOCUS)
            )
        ),
        StudyType(
            id = "interleaving",
            name = "Interleaved Practice",
            shortSummary = "Alternate between multiple related topics rather than blocking a single subject.",
            explanation = "Improves your ability to categorize problems and choose appropriate solution strategies dynamically.",
            researchReference = "Rohrer, D., & Taylor, K. (2007). The shuffling of mathematics problems. Instructional Science.",
            recommendedDurations = "20 min Subject A / 20 min Subject B / 20 min Subject C",
            starterBlocks = listOf(
                StudyBlock(title = "Subject A (Mathematics)", durationMinutes = 20, type = BlockType.FOCUS),
                StudyBlock(title = "Short Break", durationMinutes = 5, type = BlockType.SHORT_BREAK),
                StudyBlock(title = "Subject B (Physics)", durationMinutes = 20, type = BlockType.FOCUS),
                StudyBlock(title = "Short Break", durationMinutes = 5, type = BlockType.SHORT_BREAK),
                StudyBlock(title = "Subject C (Computer Science)", durationMinutes = 20, type = BlockType.FOCUS)
            )
        ),
        StudyType(
            id = "spaced-repetition",
            name = "Spaced Repetition Review",
            shortSummary = "Systematic review of previous topics at calculated expanding time intervals.",
            explanation = "Exploits the psychological spacing effect to slow down forgetting curves.",
            researchReference = "Ebbinghaus, H. (1885). Memory: A Contribution to Experimental Psychology.",
            recommendedDurations = "15 min quick review / 30 min fresh material focus",
            starterBlocks = listOf(
                StudyBlock(title = "Spaced Deck / Note Review", durationMinutes = 15, type = BlockType.RECALL),
                StudyBlock(title = "Deep Focus New Content", durationMinutes = 30, type = BlockType.FOCUS),
                StudyBlock(title = "Restorative Break", durationMinutes = 10, type = BlockType.SHORT_BREAK)
            )
        )
    )
}
