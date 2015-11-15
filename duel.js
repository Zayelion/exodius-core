/*jslint  node: true, plusplus: true*/
'use strict';
var enums = require('./enums.js'),
    SendToAll;

function analyse(msg, communications) {
    SendToAll = communications.SendToAll;
    var GameMessage = enums.STOC.STOC_GAME_MSG[msg];
    switch (msg) {
    case 'MSG_RETRY':
        onRetry();
        return 1;
    case 'MSG_HINT':
        onHint(cmsg);
        break;
    case 'MSG_WAITING':
        //missing?
        break;
    case 'MSG_START':
        //missing?
    case 'MSG_WIN':
        onWin(cmsg);
        return 2;
    case 'MSG_UPDATE_DATA':
        //missing?
        break;
    case 'MSG_UPDATE_CARD':
        //missing?
        break;
    case 'MSG_UPDATE_CARD':
        //missing?
        break;
    case GameMessage.SelectBattleCmd:
        onSelectBattleCmd(cmsg);
        return 1;
    case GameMessage.SelectIdleCmd:
        onSelectIdleCmd(cmsg);
        return 1;
    case GameMessage.SelectEffectYn:
        onSelectEffectYn(cmsg);
        return 1;
    case GameMessage.SelectYesNo:
        onSelectYesNo(cmsg);
        return 1;
    case GameMessage.SelectOption:
        onSelectOption(cmsg);
        return 1;
    case GameMessage.SelectCard:
    case GameMessage.SelectTribute:
        onSelectCard(cmsg);
        return 1;
    case GameMessage.SelectChain:
        return onSelectChain(cmsg);
    case GameMessage.SelectPlace:
    case GameMessage.SelectDisfield:
    case GameMessage.SelectPosition:
        onSelectPlace(cmsg);
        return 1;
    case GameMessage.SelectCounter:
        onSelectCounter(cmsg);
        return 1;
    case GameMessage.SelectSum:
        onSelectSum(cmsg);
        return 1;
    case GameMessage.SortCard:
    case GameMessage.SortChain:
        onSortCard(cmsg);
        return 1;
    case GameMessage.ConfirmDecktop:
        onConfirmDecktop(cmsg);
        break;
    case GameMessage.ConfirmCards:
        onConfirmCards(cmsg);
        break;
    case GameMessage.ShuffleDeck:
    case GameMessage.RefreshDeck:
        SendToAll(cmsg, 1);
        break;
    case GameMessage.ShuffleHand:
        onShuffleHand(cmsg);
        break;
    case GameMessage.SwapGraveDeck:
        onSwapGraveDeck(cmsg);
        break;
    case GameMessage.ReverseDeck:
        SendToAll(cmsg, 0);
        break;
    case GameMessage.DeckTop:
        SendToAll(cmsg, 6);
        break;
    case GameMessage.ShuffleSetCard:
        onShuffleSetCard(cmsg);
        break;
    case GameMessage.NewTurn:
        onNewTurn(cmsg);
        break;
    case GameMessage.NewPhase:
        onNewPhase(cmsg);
        break;
    case GameMessage.Move:
        onMove(cmsg);
        break;
    case GameMessage.PosChange:
        onPosChange(cmsg);
        break;
    case GameMessage.Set:
        onSet(cmsg);
        break;
    case GameMessage.Swap:
        SendToAll(cmsg, 16);
        break;
    case GameMessage.FieldDisabled:
        SendToAll(cmsg, 4);
        break;
    case GameMessage.Summoned:
    case GameMessage.SpSummoned:
    case GameMessage.FlipSummoned:
        SendToAll(cmsg, 0);
        Game.RefreshMonsters(0);
        Game.RefreshMonsters(1);
        Game.RefreshSpells(0);
        Game.RefreshSpells(1);
        break;
    case GameMessage.Summoning:
    case GameMessage.SpSummoning:
        SendToAll(cmsg, 8);
        break;
    case GameMessage.FlipSummoning:
        onFlipSummoning(cmsg);
        break;
    case GameMessage.Chaining:
        SendToAll(cmsg, 16);
        break;
    case GameMessage.Chained:
        SendToAll(cmsg, 1);
        Game.RefreshAll();
        break;
    case GameMessage.ChainSolving:
        SendToAll(cmsg, 1);
        break;
    case GameMessage.ChainSolved:
        SendToAll(cmsg, 1);
        Game.RefreshAll();
        break;
    case GameMessage.ChainEnd:
        SendToAll(cmsg, 0);
        Game.RefreshAll();
        break;
    case GameMessage.ChainNegated:
    case GameMessage.ChainDisabled:
        SendToAll(cmsg, 1);
        break;
    case GameMessage.CardSelected:
        onCardSelected(cmsg);
        break;
    case GameMessage.RandomSelected:
        onRandomSelected(cmsg);
        break;
    case GameMessage.BecomeTarget:
        onBecomeTarget(cmsg);
        break;
    case GameMessage.Draw:
        onDraw(cmsg);
        break;
    case GameMessage.Damage:
    case GameMessage.Recover:
    case GameMessage.LpUpdate:
    case GameMessage.PayLpCost:
        onLpUpdate(cmsg);
        break;
    case GameMessage.Equip:
        SendToAll(cmsg, 8);
        break;
    case GameMessage.Unequip:
        SendToAll(cmsg, 4);
        break;
    case GameMessage.CardTarget:
    case GameMessage.CancelTarget:
        SendToAll(cmsg, 8);
        break;
    case GameMessage.AddCounter:
    case GameMessage.RemoveCounter:
        SendToAll(cmsg, 6);
        break;
    case GameMessage.Attack:
        SendToAll(cmsg, 8);
        break;
    case GameMessage.Battle:
        SendToAll(cmsg, 26);
        break;
    case GameMessage.AttackDiabled:
        SendToAll(cmsg, 0);
        break;
    case GameMessage.DamageStepStart:
    case GameMessage.DamageStepEnd:
        SendToAll(cmsg, 0);
        Game.RefreshMonsters(0);
        Game.RefreshMonsters(1);
        break;
    case GameMessage.MissedEffect:
        onMissedEffect(cmsg);
        break;
    case GameMessage.TossCoin:
    case GameMessage.TossDice:
        onTossCoin(cmsg);
        break;
    case GameMessage.AnnounceRace:
        onAnnounceRace(cmsg);
        return 1;
    case GameMessage.AnnounceAttrib:
        onAnnounceAttrib(cmsg);
        return 1;
    case GameMessage.AnnounceCard:
        onAnnounceCard(cmsg);
        return 1;
    case GameMessage.AnnounceNumber:
        onAnnounceNumber(cmsg);
        return 1;
    case GameMessage.CardHint:
        SendToAll(cmsg, 9);
        break;
    case GameMessage.MatchKill:
        onMatchKill(cmsg);
        break;
    case GameMessage.TagSwap:
        onTagSwap(cmsg);
        break;
    default:
        throw new Error("[GameAnalyser] Unhandled packet id: " + msg);
    }
}