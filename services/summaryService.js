export class SummaryService {
  constructor() {
    this.transferVerbs = [
      "dramatically swapped", "panicked and traded", "strategically offloaded", 
      "desperately ditched", "confidently exchanged", "nervously replaced",
      "boldly switched", "cautiously transferred", "recklessly swapped",
      "wisely traded", "hastily replaced", "carefully exchanged"
    ];

    this.chipReactions = [
      "unleashed the power of", "desperately activated", "strategically deployed",
      "panicked and used", "confidently played", "nervously triggered",
      "boldly unleashed", "cautiously activated", "recklessly deployed",
      "wisely used", "hastily triggered", "carefully played"
    ];

    this.captainChanges = [
      "had a sudden change of heart and made", "panicked and switched captain to",
      "strategically appointed", "desperately changed captain to",
      "confidently selected", "nervously switched to",
      "boldly appointed", "cautiously selected", "recklessly changed to",
      "wisely appointed", "hastily switched to", "carefully selected"
    ];

    this.benchChanges = [
      "decided to bench", "panicked and benched", "strategically dropped",
      "desperately benched", "confidently dropped", "nervously benched",
      "boldly dropped", "cautiously benched", "recklessly dropped",
      "wisely benched", "hastily dropped", "carefully benched"
    ];

    this.transferReactions = [
      "🎯 Transfer masterclass!", "😱 Panic transfer alert!", "🧠 Strategic genius!",
      "😰 Desperate times call for desperate measures!", "😎 Smooth operator!", "😅 Nervous transfer!",
      "🔥 Bold move!", "🤔 Calculated risk!", "😤 Reckless abandon!", 
      "🧐 Wise decision!", "⚡ Lightning fast!", "🎭 Drama queen!"
    ];

    this.chipReactionsEmoji = [
      "🎭", "😱", "🧠", "😰", "😎", "😅", "🔥", "🤔", "😤", "🧐", "⚡", "🎯"
    ];
  }

  generateDeadlineSummary(draftData, gameweek) {
    try {
      const summary = {
        gameweek: gameweek,
        timestamp: new Date().toISOString(),
        headline: this.generateHeadline(gameweek),
        transfers: this.summarizeTransfers(draftData, gameweek),
        chips: this.summarizeChips(draftData, gameweek),
        teamChanges: this.summarizeTeamChanges(draftData, gameweek),
        overallVibe: this.generateOverallVibe(draftData, gameweek),
        closingStatement: this.generateClosingStatement(gameweek)
      };

      return summary;
    } catch (error) {
      console.error('Failed to generate deadline summary:', error);
      return {
        error: 'Failed to generate summary',
        gameweek: gameweek
      };
    }
  }

  generateHeadline(gameweek) {
    const headlines = [
      `🚨 DEADLINE DAY DRAMA: Gameweek ${gameweek} Edition! 🚨`,
      `⏰ The Clock Struck Midnight: Gameweek ${gameweek} Deadline Report! ⏰`,
      `🎭 Transfer Window Slams Shut: Gameweek ${gameweek} Chaos Summary! 🎭`,
      `🔥 Last-Minute Madness: Gameweek ${gameweek} Deadline Roundup! 🔥`,
      `⚡ Deadline Day Explosion: Gameweek ${gameweek} Transfer Frenzy! ⚡`
    ];
    
    return headlines[Math.floor(Math.random() * headlines.length)];
  }

  summarizeTransfers(draftData, gameweek) {
    const transfers = draftData.transfers.filter(t => t.gameweek === gameweek);
    
    if (transfers.length === 0) {
      return "🤷‍♂️ **Transfer Activity**: Absolutely nothing happened. Everyone was too busy watching paint dry. 🎨";
    }

    const transferSummaries = transfers.map(transfer => {
      const user = draftData.users.find(u => u.id === transfer.userId);
      const verb = this.transferVerbs[Math.floor(Math.random() * this.transferVerbs.length)];
      const reaction = this.transferReactions[Math.floor(Math.random() * this.transferReactions.length)];
      
      // Try to get player names if available
      let playerInfo = '';
      if (transfer.playerOutId && transfer.playerInId) {
        playerInfo = ` (Player ${transfer.playerOutId} → Player ${transfer.playerInId})`;
      }
      
      return `**${user.username}** ${verb} a player${playerInfo} ${reaction}`;
    });

    const totalTransfers = transfers.length;
    let summary = `🔄 **Transfer Activity**: ${totalTransfers} transfer${totalTransfers > 1 ? 's' : ''} made in the final hours!\n\n`;
    
    transferSummaries.forEach((transfer, index) => {
      summary += `${index + 1}. ${transfer}\n`;
    });

    return summary;
  }

  summarizeChips(draftData, gameweek) {
    const chips = draftData.chipHistory.filter(c => c.gameweek === gameweek);
    
    if (chips.length === 0) {
      return "🎴 **Chip Usage**: No chips were harmed in the making of this gameweek. Everyone's saving them for a rainy day! ☔";
    }

    const chipSummaries = chips.map(chip => {
      const user = draftData.users.find(u => u.id === chip.userId);
      const verb = this.chipReactions[Math.floor(Math.random() * this.chipReactions.length)];
      const emoji = this.chipReactionsEmoji[Math.floor(Math.random() * this.chipReactionsEmoji.length)];
      
      let targetInfo = '';
      if (chip.targetUserId) {
        const targetUser = draftData.users.find(u => u.id === chip.targetUserId);
        targetInfo = ` on **${targetUser.username}**`;
      }
      
      return `**${user.username}** ${verb} **${chip.chipName}**${targetInfo} ${emoji}`;
    });

    const totalChips = chips.length;
    let summary = `🎴 **Chip Usage**: ${totalChips} chip${totalChips > 1 ? 's' : ''} unleashed before the deadline!\n\n`;
    
    chipSummaries.forEach((chip, index) => {
      summary += `${index + 1}. ${chip}\n`;
    });

    return summary;
  }

  summarizeTeamChanges(draftData, gameweek) {
    const teamChanges = [];
    
    // Look for captain changes and bench changes in the current gameweek
    draftData.users.forEach(user => {
      if (user.activePlayers && user.activePlayers.length > 0) {
        // This is a simplified approach - in a real implementation you'd track actual changes
        if (user.captain) {
          teamChanges.push({
            user: user.username,
            type: 'captain',
            player: user.captain
          });
        }
      }
    });

    if (teamChanges.length === 0) {
      return "👥 **Team Changes**: Everyone kept their teams exactly the same. Boring! 😴";
    }

    let summary = `👥 **Team Changes**: Some last-minute tactical adjustments!\n\n`;
    
    teamChanges.forEach((change, index) => {
      const verb = this.captainChanges[Math.floor(Math.random() * this.captainChanges.length)];
      summary += `${index + 1}. **${change.user}** ${verb} a new captain! 👑\n`;
    });

    return summary;
  }

  generateOverallVibe(draftData, gameweek) {
    const transfers = draftData.transfers.filter(t => t.gameweek === gameweek);
    const chips = draftData.chipHistory.filter(c => c.gameweek === gameweek);
    
    const totalActivity = transfers.length + chips.length;
    
    if (totalActivity === 0) {
      return "😴 **Overall Vibe**: Deadline day was as exciting as watching grass grow. Everyone must have been on vacation! 🏖️";
    } else if (totalActivity <= 2) {
      return "😐 **Overall Vibe**: A quiet deadline day. Some might call it 'strategic', others might call it 'boring'! 🤷‍♂️";
    } else if (totalActivity <= 5) {
      return "😮 **Overall Vibe**: Moderate deadline day activity! Some users were clearly feeling the pressure! 😅";
    } else if (totalActivity <= 8) {
      return "😱 **Overall Vibe**: CHAOS! Absolute deadline day madness! Users were making moves like their lives depended on it! 🔥";
    } else {
      return "🚨 **Overall Vibe**: APOCALYPTIC DEADLINE DAY! The transfer market was on fire! Users were making moves faster than a caffeinated cheetah! ⚡";
    }
  }

  generateClosingStatement(gameweek) {
    const statements = [
      `🎬 **That's a wrap on Gameweek ${gameweek} deadline day!** Time to sit back, relax, and watch the chaos unfold on the pitch! ⚽`,
      `🎭 **Gameweek ${gameweek} deadline drama complete!** Now we wait to see if all these last-minute decisions were genius or madness! 🤔`,
      `🔥 **Deadline day for Gameweek ${gameweek} is officially OVER!** No more changes, no more panic, no more excuses! Let the games begin! 🏆`,
      `⏰ **The clock has struck midnight for Gameweek ${gameweek}!** All transfers are locked, all chips are played, all teams are set! Good luck everyone! 🍀`,
      `🚪 **Transfer window SLAMMED SHUT for Gameweek ${gameweek}!** What's done is done. Time to face the consequences of your deadline day decisions! 😈`
    ];
    
    return statements[Math.floor(Math.random() * statements.length)];
  }

  formatSummaryForDisplay(summary) {
    let formatted = '';
    
    formatted += `# ${summary.headline}\n\n`;
    formatted += `📅 **Gameweek**: ${summary.gameweek}\n`;
    formatted += `⏰ **Deadline**: ${new Date(summary.timestamp).toLocaleString()}\n\n`;
    formatted += `---\n\n`;
    formatted += `${summary.transfers}\n\n`;
    formatted += `${summary.chips}\n\n`;
    formatted += `${summary.teamChanges}\n\n`;
    formatted += `${summary.overallVibe}\n\n`;
    formatted += `---\n\n`;
    formatted += `${summary.closingStatement}\n\n`;
    formatted += `🎯 **Next Deadline**: Check the app for upcoming gameweek deadlines!\n`;
    
    return formatted;
  }
}
